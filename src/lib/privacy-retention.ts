import { and, count, isNotNull, isNull, lte, or, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/mysql2';
import type { Connection, RowDataPacket } from 'mysql2/promise';
import { analyticsEvents, measurementOutbox, payments, privacyConsents, webVitals } from '@/lib/db/schema';

export const PRIVACY_RETENTION_POLICY = 'privacy-2026-09-13';
export const PRIVACY_RETENTION = { rawDays: 90, queueDays: 30, aggregateMonths: 13, evidenceYears: 1 } as const;

export function privacyRetentionCutoffs(now: Date) {
  if (!Number.isFinite(now.getTime())) throw new Error('Invalid retention date');
  const evidence = new Date(now);
  evidence.setUTCFullYear(evidence.getUTCFullYear() - PRIVACY_RETENTION.evidenceYears);
  // Clamp leap-day anniversaries to the final day of February.
  if (evidence.getUTCMonth() !== now.getUTCMonth()) evidence.setUTCDate(0);
  return {
    raw: new Date(now.getTime() - PRIVACY_RETENTION.rawDays * 86_400_000),
    queue: new Date(now.getTime() - PRIVACY_RETENTION.queueDays * 86_400_000),
    evidence,
  };
}

// A dedicated caller-owned connection keeps the advisory lock on one session.
// No production connection is opened by this module.
export async function runPrivacyRetention(connection: Connection, options: {
  apply?: boolean;
  now?: Date;
  batchSize?: number;
  maxBatches?: number;
} = {}) {
  const batchSize = options.batchSize ?? 500;
  const maxBatches = options.maxBatches ?? 20;
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 1000
    || !Number.isInteger(maxBatches) || maxBatches < 1 || maxBatches > 100) throw new Error('Invalid retention bounds');
  const cutoffs = privacyRetentionCutoffs(options.now ?? new Date());
  const database = drizzle(connection);
  const lockName = 'milerdev:privacy-retention';
  const [lock] = await connection.execute<RowDataPacket[]>('SELECT GET_LOCK(?, 0) AS acquired', [lockName]);
  if (Number(lock[0]?.acquired) !== 1) throw new Error('Retention already running');
  try {
    const queueExpired = or(
      and(isNull(measurementOutbox.projectedAt), lte(measurementOutbox.createdAt, cutoffs.queue)),
      lte(measurementOutbox.projectedAt, cutoffs.queue),
    )!;
    const rawExpired = lte(analyticsEvents.createdAt, cutoffs.raw);
    const vitalsExpired = lte(webVitals.createdAt, cutoffs.raw);
    const attributionExpired = and(isNotNull(payments.attributedExposureId), lte(payments.createdAt, cutoffs.raw))!;
    const evidenceExpired = or(lte(privacyConsents.revokedAt, cutoffs.evidence), lte(privacyConsents.expiresAt, cutoffs.evidence))!;
    const operations = [
      // Remove replay sources before raw facts. Operational purchase/learning rows survive.
      { name: 'outbox', count: () => database.select({ value: count() }).from(measurementOutbox).where(queueExpired), batch: () => database.delete(measurementOutbox).where(queueExpired).limit(batchSize) },
      { name: 'analytics', count: () => database.select({ value: count() }).from(analyticsEvents).where(rawExpired), batch: () => database.delete(analyticsEvents).where(rawExpired).limit(batchSize) },
      { name: 'webVitals', count: () => database.select({ value: count() }).from(webVitals).where(vitalsExpired), batch: () => database.delete(webVitals).where(vitalsExpired).limit(batchSize) },
      { name: 'paymentAttribution', count: () => database.select({ value: count() }).from(payments).where(attributionExpired), batch: () => database.update(payments).set({ attributedExposureId: null }).where(attributionExpired).limit(batchSize) },
      { name: 'consentEvidence', count: () => database.select({ value: count() }).from(privacyConsents).where(evidenceExpired), batch: () => database.delete(privacyConsents).where(evidenceExpired).limit(batchSize) },
    ];
    const results: Record<string, { eligible: number; affected: number; remaining: number }> = {};
    for (const operation of operations) {
      const [{ value: eligible }] = await operation.count();
      let affected = 0;
      if (options.apply) {
        for (let batch = 0; batch < maxBatches; batch++) {
          const [result] = await operation.batch();
          affected += result.affectedRows;
          if (result.affectedRows < batchSize) break;
        }
      }
      const [{ value: remaining }] = await operation.count();
      results[operation.name] = { eligible: Number(eligible), affected, remaining: Number(remaining) };
      // Finish the backlog of replay sources before deleting raw measurements.
      if (options.apply && operation.name === 'outbox' && Number(remaining) > 0) break;
    }
    const [{ value: undatedAnalytics }] = await database.select({ value: count() }).from(analyticsEvents).where(isNull(analyticsEvents.createdAt));
    const [{ value: undatedAttribution }] = await database.select({ value: count() }).from(payments)
      .where(and(isNull(payments.createdAt), isNotNull(payments.attributedExposureId)));
    return { policy: PRIVACY_RETENTION_POLICY, mode: options.apply ? 'apply' : 'dry-run', cutoffs, results,
      manualReview: { undatedAnalytics: Number(undatedAnalytics), undatedAttribution: Number(undatedAttribution) },
      aggregates: 'No persisted aggregate table; 13-month policy applies before any future aggregate storage is introduced.' };
  } finally {
    await database.execute(sql`SELECT RELEASE_LOCK(${lockName})`);
  }
}

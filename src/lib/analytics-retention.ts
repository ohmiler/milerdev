import { lt } from 'drizzle-orm';
import { z } from 'zod';

import { getAnalyticsControlState } from '@/lib/analytics-control';
import { db } from '@/lib/db';
import { analyticsEvents, webVitals } from '@/lib/db/schema';

const DAY_MS = 24 * 60 * 60 * 1_000;
const DEFAULT_BATCH_SIZE = 1_000;

const retentionRequestSchema = z.object({
  now: z.date().refine((date) => !Number.isNaN(date.getTime()), 'Invalid date'),
  rawEventRetentionDays: z.number().int().min(1).max(3_650),
  batchSize: z.number().int().min(1).max(5_000).default(DEFAULT_BATCH_SIZE),
}).strict();

export interface AnalyticsRetentionStore {
  deleteRawMeasurementsBefore(cutoff: Date, batchSize: number): Promise<{
    analyticsEvents: number;
    webVitals: number;
  }>;
}

export class AnalyticsRetentionError extends Error {
  constructor(public readonly code: 'INVALID_POLICY' | 'GOVERNANCE_REQUIRED') {
    super(code);
    this.name = 'AnalyticsRetentionError';
  }
}

export function createAnalyticsRetentionPolicy(store: AnalyticsRetentionStore) {
  return {
    async deleteExpiredRawEvents(input: {
      now: Date;
      rawEventRetentionDays: number;
      batchSize?: number;
    }) {
      const parsed = retentionRequestSchema.safeParse(input);
      if (!parsed.success) throw new AnalyticsRetentionError('INVALID_POLICY');

      const cutoff = new Date(
        parsed.data.now.getTime() - parsed.data.rawEventRetentionDays * DAY_MS,
      );
      const deleted = await store.deleteRawMeasurementsBefore(cutoff, parsed.data.batchSize);
      return {
        cutoff,
        deletedCount: deleted.analyticsEvents + deleted.webVitals,
        deletedAnalyticsEventCount: deleted.analyticsEvents,
        deletedWebVitalCount: deleted.webVitals,
        batchSize: parsed.data.batchSize,
      };
    },
  };
}

function affectedRows(result: unknown): number {
  const candidate = Array.isArray(result) ? result[0] : result;
  if (!candidate || typeof candidate !== 'object' || !('affectedRows' in candidate)) return 0;
  const count = Number((candidate as { affectedRows: unknown }).affectedRows);
  return Number.isFinite(count) ? count : 0;
}

const drizzleAnalyticsRetentionStore: AnalyticsRetentionStore = {
  async deleteRawMeasurementsBefore(cutoff, batchSize) {
    return db.transaction(async (tx) => {
      const analyticsResult = await tx
        .delete(analyticsEvents)
        .where(lt(analyticsEvents.createdAt, cutoff))
        .limit(batchSize);
      const webVitalsResult = await tx
        .delete(webVitals)
        .where(lt(webVitals.updatedAt, cutoff))
        .limit(batchSize);
      return {
        analyticsEvents: affectedRows(analyticsResult),
        webVitals: affectedRows(webVitalsResult),
      };
    });
  },
};

export const analyticsRetentionPolicy = createAnalyticsRetentionPolicy(
  drizzleAnalyticsRetentionStore,
);

export async function runAnalyticsRawEventRetention(input: {
  now?: Date;
  batchSize?: number;
} = {}) {
  const state = await getAnalyticsControlState({ fresh: true });
  const rawEventRetentionDays = state.governanceDecision?.rawEventRetentionDays;
  if (!rawEventRetentionDays) throw new AnalyticsRetentionError('GOVERNANCE_REQUIRED');

  return analyticsRetentionPolicy.deleteExpiredRawEvents({
    now: input.now ?? new Date(),
    rawEventRetentionDays,
    batchSize: input.batchSize,
  });
}

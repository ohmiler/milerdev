import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MySqlDialect } from 'drizzle-orm/mysql-core';
import type { SQL } from 'drizzle-orm';

const fixture = vi.hoisted(() => ({
  outbox: null as Record<string, unknown> | null,
  payment: null as Record<string, unknown> | null,
  enrollment: null as Record<string, unknown> | null,
  milestone: null as Record<string, unknown> | null,
  inserted: [] as Record<string, unknown>[],
  updates: [] as { values: Record<string, unknown>; where: unknown }[],
  predicates: [] as unknown[],
  locks: [] as string[],
  failInsert: null as unknown,
  failAck: false,
  committed: 0,
  transaction: null as unknown,
}));

vi.mock('@/lib/privacy-consent', () => ({ lockActiveConsent: vi.fn() }));
vi.mock('@/lib/analytics-control', () => ({ isAnalyticsEventEnabled: vi.fn() }));
vi.mock('@/lib/db', async () => {
  const { payments, enrollments } = await import('@/lib/db/schema');
  function query() {
    let table: unknown;
    const chain = {
      from(value: unknown) { table = value; return chain; },
      where(value: unknown) { fixture.predicates.push(value); return chain; },
      limit() { return chain; },
      for(mode: string) {
        fixture.locks.push(mode);
        return Promise.resolve(fixture.outbox ? [fixture.outbox] : []);
      },
      then(resolve: (rows: unknown[]) => unknown, reject: (error: unknown) => unknown) {
        const row = table === payments ? fixture.payment : table === enrollments ? fixture.enrollment : fixture.milestone;
        return Promise.resolve(row ? [row] : []).then(resolve, reject);
      },
    };
    return chain;
  }
  const update = () => ({ set: (values: Record<string, unknown>) => ({ where: async (where: unknown) => {
    fixture.updates.push({ values, where });
  } }) });
  return { db: {
    select: query, update,
    transaction: async (work: (tx: unknown) => Promise<unknown>) => {
      const inserted: Record<string, unknown>[] = [];
      const updates: { values: Record<string, unknown>; where: unknown }[] = [];
      const tx = {
        select: query,
        insert: () => ({ values: async (row: Record<string, unknown>) => {
          if (fixture.failInsert) throw fixture.failInsert;
          inserted.push(row);
        } }),
        update: () => ({ set: (values: Record<string, unknown>) => ({ where: async (where: unknown) => {
          if (fixture.failAck) throw new Error('ack unavailable');
          updates.push({ values, where });
        } }) }),
      };
      fixture.transaction = tx;
      const result = await work(tx);
      fixture.inserted.push(...inserted);
      fixture.updates.push(...updates);
      fixture.committed++;
      return result;
    },
  } };
});

import { db } from '@/lib/db';
import { lockActiveConsent } from '@/lib/privacy-consent';
import { isAnalyticsEventEnabled } from '@/lib/analytics-control';
import { projectMeasurementOutbox, recordMeasurementProjectionFailure, type MeasurementOutboxFact } from '@/lib/measurement-outbox-projection';
import { purchaseMeasurementProjector } from '@/lib/purchase-measurement-projector';
import { enrollmentMeasurementProjector } from '@/lib/enrollment-measurement-projector';
import { learningMeasurementProjector } from '@/lib/learning-measurement';

const facts: MeasurementOutboxFact[] = [
  { eventName: 'purchase_completed', paymentId: 'payment-1', userId: 'member-1', courseId: 'course-1', bundleId: null, attributedExposureId: 'exposure-1', method: 'stripe' },
  { eventName: 'free_enrollment_completed', enrollmentId: 'enrollment-1', userId: 'member-1', courseId: 'course-1' },
  { eventName: 'lesson_completed', factId: 'progress-1', courseId: 'course-1', learningEnrollmentId: 'enrollment-1', lessonId: 'lesson-1' },
  { eventName: 'course_completed', factId: 'enrollment-1', courseId: 'course-1', learningEnrollmentId: 'enrollment-1', lessonId: null },
];
const dialect = new MySqlDialect();
const compile = (condition: unknown) => dialect.sqlToQuery(condition as SQL);

beforeEach(() => {
  vi.clearAllMocks();
  fixture.outbox = { id: 'outbox-1', consentId: 'receipt-1', createdAt: new Date('2026-09-01T00:00:00Z') };
  fixture.payment = null; fixture.enrollment = null; fixture.milestone = null;
  fixture.inserted = []; fixture.updates = []; fixture.predicates = []; fixture.locks = [];
  fixture.failInsert = null; fixture.failAck = false; fixture.committed = 0;
  vi.mocked(lockActiveConsent).mockResolvedValue(true);
  vi.mocked(isAnalyticsEventEnabled).mockResolvedValue(true);
});

describe('committed measurement outbox projection', () => {
  it.each(facts)('projects $eventName using its domain identity and original timestamp', async (fact) => {
    expect(await projectMeasurementOutbox(db, fact)).toBe('projected');
    const identityColumn = fact.eventName === 'purchase_completed' ? 'payment_id'
      : fact.eventName === 'free_enrollment_completed' ? 'enrollment_id' : 'learning_fact_id';
    const identity = 'paymentId' in fact ? fact.paymentId : 'enrollmentId' in fact ? fact.enrollmentId : fact.factId;
    const query = compile(fixture.predicates[0]);
    expect(query.sql).toContain('`' + identityColumn + '` = ?');
    expect(query.sql).toContain('`projected_at` is null');
    expect(query.params).toEqual([fact.eventName, identity]);
    expect(fixture.locks).toEqual(['update']);
    expect(lockActiveConsent).toHaveBeenCalledWith(fixture.transaction, 'receipt-1');
    expect(fixture.inserted[0]).toMatchObject({ eventName: fact.eventName, source: 'server', createdAt: fixture.outbox?.createdAt, ipAddress: null, userAgent: null });
    expect(fixture.updates[0].values).toMatchObject({ projectedAt: expect.any(Date), lastErrorCode: null });
    expect(compile(fixture.updates[0].where).params).toEqual(['outbox-1']);
    expect(fixture.committed).toBe(1);
  });

  it('never creates an outbox or event when no pending committed entry exists', async () => {
    fixture.outbox = null;
    expect(await projectMeasurementOutbox(db, facts[0])).toBe('already_projected');
    expect(lockActiveConsent).not.toHaveBeenCalled();
    expect(fixture.inserted).toHaveLength(0);
    expect(fixture.updates).toHaveLength(0);
  });

  it.each([null, 'withdrawn-receipt', 'expired-receipt'])('keeps an ineligible captured consent (%s) unprojected', async (consentId) => {
    fixture.outbox = { ...fixture.outbox, consentId };
    vi.mocked(lockActiveConsent).mockResolvedValue(false);
    expect(await projectMeasurementOutbox(db, facts[0])).toBe('ineligible');
    expect(lockActiveConsent).toHaveBeenCalledWith(fixture.transaction, consentId);
    expect(fixture.inserted).toHaveLength(0);
    expect(fixture.updates).toHaveLength(0);
  });

  it('does not acknowledge when consent locking fails', async () => {
    vi.mocked(lockActiveConsent).mockRejectedValue(new Error('consent unavailable'));
    await expect(projectMeasurementOutbox(db, facts[0])).rejects.toThrow('consent unavailable');
    expect(fixture.inserted).toHaveLength(0);
    expect(fixture.updates).toHaveLength(0);
    expect(fixture.committed).toBe(0);
  });

  it('acknowledges a duplicate fact without inserting another', async () => {
    fixture.failInsert = new Error('query failed', { cause: Object.assign(new Error('duplicate'), { code: 'ER_DUP_ENTRY' }) });
    expect(await projectMeasurementOutbox(db, facts[0])).toBe('duplicate');
    expect(fixture.inserted).toHaveLength(0);
    expect(fixture.updates[0].values.projectedAt).toBeInstanceOf(Date);
  });

  it('leaves insert failures retryable and acknowledges only a successful retry', async () => {
    fixture.failInsert = Object.assign(new Error('write unavailable'), { code: 'ECONNRESET' });
    await expect(projectMeasurementOutbox(db, facts[0])).rejects.toThrow('write unavailable');
    expect(fixture.updates).toHaveLength(0);
    expect(fixture.committed).toBe(0);
    fixture.failInsert = null;
    expect(await projectMeasurementOutbox(db, facts[0])).toBe('projected');
    expect(fixture.inserted).toHaveLength(1);
    expect(fixture.updates).toHaveLength(1);
  });

  it('propagates acknowledgement failure to the transaction for rollback', async () => {
    fixture.failAck = true;
    await expect(projectMeasurementOutbox(db, facts[0])).rejects.toThrow('ack unavailable');
    expect(fixture.committed).toBe(0);
    expect(fixture.inserted).toHaveLength(0);
    fixture.failAck = false;
    expect(await projectMeasurementOutbox(db, facts[0])).toBe('projected');
    expect(fixture.inserted).toHaveLength(1);
  });

  it.each(facts)('records failure only against the pending $eventName identity', async (fact) => {
    await recordMeasurementProjectionFailure(db, fact);
    expect(compile(fixture.updates[0].where).params).toEqual([
      fact.eventName, 'paymentId' in fact ? fact.paymentId : 'enrollmentId' in fact ? fact.enrollmentId : fact.factId,
    ]);
    expect(compile(fixture.updates[0].where).sql).toContain('`projected_at` is null');
    expect(fixture.updates[0].values.lastErrorCode).toBe('projection_failed');
    expect(fixture.updates[0].values).not.toHaveProperty('projectedAt');
  });
});

describe('production projector adapters', () => {
  it('keeps purchase attribution and method on the paid identity', async () => {
    fixture.payment = { ...facts[0], status: 'completed', amount: '990.00' };
    expect(await purchaseMeasurementProjector.projectPurchase('payment-1')).toEqual({ status: 'projected' });
    expect(fixture.inserted[0]).toMatchObject({ paymentId: 'payment-1', attributedExposureId: 'exposure-1', metadata: JSON.stringify({ method: 'stripe' }), userId: 'member-1' });
  });

  it('keeps free enrollment separate from a paid fact', async () => {
    fixture.enrollment = { enrollmentId: 'enrollment-1', userId: 'member-1', courseId: 'course-1' };
    expect(await enrollmentMeasurementProjector.projectEnrollment('enrollment-1')).toEqual({ status: 'projected' });
    expect(fixture.inserted[0]).toMatchObject({ enrollmentId: 'enrollment-1', paymentId: null, metadata: null });
  });

  it.each(['lesson_completed', 'course_completed'] as const)('keeps %s anonymous while retaining its learning identity', async (eventName) => {
    fixture.milestone = { eventName, factId: 'fact-1', enrollmentId: 'enrollment-1', courseId: 'course-1', lessonId: eventName === 'lesson_completed' ? 'lesson-1' : null, createdAt: new Date() };
    expect(await learningMeasurementProjector.projectMilestone({ eventName, factId: 'fact-1' })).toEqual({ status: 'projected' });
    expect(fixture.inserted[0]).toMatchObject({ eventName, userId: null, paymentId: null, enrollmentId: null, learningFactId: 'fact-1', learningEnrollmentId: 'enrollment-1', metadata: null });
  });

  it('keeps production projection failure best-effort after payment is committed', async () => {
    fixture.payment = { ...facts[0], status: 'completed', amount: '990.00' };
    fixture.failInsert = new Error('database unavailable');
    expect(await purchaseMeasurementProjector.projectPurchase('payment-1')).toEqual({ status: 'failed' });
    expect(fixture.payment.status).toBe('completed');
    expect(fixture.inserted).toHaveLength(0);
    expect(fixture.updates[0].values.lastErrorCode).toBe('projection_failed');
  });
});

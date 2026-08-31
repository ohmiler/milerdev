import { lt } from 'drizzle-orm';
import { z } from 'zod';

import { getAnalyticsControlState } from '@/lib/analytics-control';
import { db } from '@/lib/db';
import { analyticsEvents } from '@/lib/db/schema';

const DAY_MS = 24 * 60 * 60 * 1_000;
const DEFAULT_BATCH_SIZE = 1_000;

const retentionRequestSchema = z.object({
  now: z.date().refine((date) => !Number.isNaN(date.getTime()), 'Invalid date'),
  rawEventRetentionDays: z.number().int().min(1).max(3_650),
  batchSize: z.number().int().min(1).max(5_000).default(DEFAULT_BATCH_SIZE),
}).strict();

export interface AnalyticsRetentionStore {
  deleteRawEventsBefore(cutoff: Date, batchSize: number): Promise<number>;
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
      const deletedCount = await store.deleteRawEventsBefore(cutoff, parsed.data.batchSize);
      return { cutoff, deletedCount, batchSize: parsed.data.batchSize };
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
  async deleteRawEventsBefore(cutoff, batchSize) {
    const result = await db
      .delete(analyticsEvents)
      .where(lt(analyticsEvents.createdAt, cutoff))
      .limit(batchSize);
    return affectedRows(result);
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

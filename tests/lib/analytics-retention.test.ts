import { describe, expect, it } from 'vitest';

import {
  AnalyticsRetentionError,
  createAnalyticsRetentionPolicy,
  type AnalyticsRetentionStore,
} from '@/lib/analytics-retention';

class MemoryAnalyticsRetentionStore implements AnalyticsRetentionStore {
  calls: Array<{ cutoff: Date; batchSize: number }> = [];

  async deleteRawMeasurementsBefore(cutoff: Date, batchSize: number) {
    this.calls.push({ cutoff, batchSize });
    return { analyticsEvents: 5, webVitals: 2 };
  }
}

describe('analytics raw-event retention policy', () => {
  it('deletes only through the raw analytics boundary using the approved cutoff', async () => {
    const store = new MemoryAnalyticsRetentionStore();
    const policy = createAnalyticsRetentionPolicy(store);

    const result = await policy.deleteExpiredRawEvents({
      now: new Date('2026-08-31T12:00:00.000Z'),
      rawEventRetentionDays: 30,
      batchSize: 500,
    });

    expect(result).toEqual({
      cutoff: new Date('2026-08-01T12:00:00.000Z'),
      deletedCount: 7,
      deletedAnalyticsEventCount: 5,
      deletedWebVitalCount: 2,
      batchSize: 500,
    });
    expect(store.calls).toEqual([{
      cutoff: new Date('2026-08-01T12:00:00.000Z'),
      batchSize: 500,
    }]);
  });

  it('rejects unsafe retention windows and batch sizes before deletion', async () => {
    const store = new MemoryAnalyticsRetentionStore();
    const policy = createAnalyticsRetentionPolicy(store);

    await expect(policy.deleteExpiredRawEvents({
      now: new Date('2026-08-31T12:00:00.000Z'),
      rawEventRetentionDays: 0,
    })).rejects.toBeInstanceOf(AnalyticsRetentionError);
    await expect(policy.deleteExpiredRawEvents({
      now: new Date('2026-08-31T12:00:00.000Z'),
      rawEventRetentionDays: 30,
      batchSize: 50_000,
    })).rejects.toBeInstanceOf(AnalyticsRetentionError);
    expect(store.calls).toHaveLength(0);
  });
});

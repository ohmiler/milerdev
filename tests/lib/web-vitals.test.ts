import { describe, expect, it, vi } from 'vitest';

import {
  createWebVitalsRecorder,
  deriveWebVitalRating,
  webVitalReportSchema,
  type StoredWebVital,
  type WebVitalsStore,
} from '@/lib/web-vitals';

const validReport = {
  pageLoadId: 'v4-1720000000000-123456789',
  metricName: 'LCP',
  routeFamily: 'product_detail',
  deviceClass: 'mobile',
  value: 2_400,
  rating: 'good',
} as const;

class MemoryWebVitalsStore implements WebVitalsStore {
  records = new Map<string, StoredWebVital>();

  async upsert(metric: StoredWebVital) {
    this.records.set(`${metric.pageLoadId}:${metric.metricName}`, metric);
  }
}

describe('Web Vitals contract', () => {
  it('accepts only bounded LCP, INP, and CLS values with matching ratings', () => {
    expect(webVitalReportSchema.safeParse(validReport).success).toBe(true);
    expect(webVitalReportSchema.safeParse({
      ...validReport,
      metricName: 'INP',
      value: 200,
      rating: 'good',
    }).success).toBe(true);
    expect(webVitalReportSchema.safeParse({
      ...validReport,
      metricName: 'CLS',
      value: 0.25,
      rating: 'needs-improvement',
    }).success).toBe(true);

    for (const report of [
      { ...validReport, metricName: 'FCP' },
      { ...validReport, value: Number.NaN },
      { ...validReport, value: Number.POSITIVE_INFINITY },
      { ...validReport, value: -1 },
      { ...validReport, value: 600_001 },
      { ...validReport, metricName: 'CLS', value: 10.01, rating: 'poor' },
      { ...validReport, value: 4_001, rating: 'good' },
      { ...validReport, fullUrl: 'https://example.com/courses/private?email=person@example.com' },
      { ...validReport, userId: 'user-1' },
      { ...validReport, releaseIdentity: 'client-controlled-release' },
    ]) {
      expect(webVitalReportSchema.safeParse(report).success).toBe(false);
    }
  });

  it('derives Chrome rating thresholds consistently', () => {
    expect(deriveWebVitalRating('LCP', 2_500)).toBe('good');
    expect(deriveWebVitalRating('LCP', 4_000)).toBe('needs-improvement');
    expect(deriveWebVitalRating('INP', 200)).toBe('good');
    expect(deriveWebVitalRating('INP', 500)).toBe('needs-improvement');
    expect(deriveWebVitalRating('CLS', 0.1)).toBe('good');
    expect(deriveWebVitalRating('CLS', 0.25)).toBe('needs-improvement');
  });
});

describe('Web Vitals recorder', () => {
  it('stops before release identity and persistence when performance analytics is disabled', async () => {
    const store = new MemoryWebVitalsStore();
    const getReleaseIdentity = vi.fn(() => 'release-1');
    const recorder = createWebVitalsRecorder({
      store,
      isEventEnabled: async () => false,
      getReleaseIdentity,
    });

    await expect(recorder.record(validReport)).resolves.toEqual({ status: 'disabled' });
    expect(getReleaseIdentity).not.toHaveBeenCalled();
    expect(store.records.size).toBe(0);
  });

  it('upserts the latest callback by page-load identity and metric name', async () => {
    const store = new MemoryWebVitalsStore();
    const recorder = createWebVitalsRecorder({
      store,
      isEventEnabled: async () => true,
      getReleaseIdentity: () => 'release-1',
      now: () => new Date('2026-09-01T03:00:00.000Z'),
    });

    await expect(recorder.record(validReport)).resolves.toEqual({ status: 'recorded' });
    await expect(recorder.record({
      ...validReport,
      value: 3_200,
      rating: 'needs-improvement',
    })).resolves.toEqual({ status: 'recorded' });
    await recorder.record({
      ...validReport,
      metricName: 'INP',
      value: 180,
      rating: 'good',
    });

    expect(store.records.size).toBe(2);
    expect(store.records.get(`${validReport.pageLoadId}:LCP`)).toEqual({
      ...validReport,
      releaseIdentity: 'release-1',
      value: '3200.0000',
      rating: 'needs-improvement',
      observedAt: new Date('2026-09-01T03:00:00.000Z'),
    });
  });
});

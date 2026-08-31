import { describe, expect, it } from 'vitest';

import {
  MeasurementRecorderError,
  createMeasurementRecorder,
  type MeasurementStore,
  type ProductEligibility,
  type ProductExposureRow,
} from '@/lib/measurement-recorder';

class MemoryMeasurementStore implements MeasurementStore {
  eligibility = new Map<string, ProductEligibility>();
  exposureIds = new Set<string>();
  eligibilityReads = 0;
  inserts = 0;

  async readProductEligibility(productType: 'course' | 'bundle', productId: string) {
    this.eligibilityReads += 1;
    return this.eligibility.get(`${productType}:${productId}`) ?? null;
  }

  async insertProductExposure(row: ProductExposureRow) {
    this.inserts += 1;
    if (this.exposureIds.has(row.exposureId)) return 'duplicate' as const;
    this.exposureIds.add(row.exposureId);
    return 'inserted' as const;
  }
}

describe('MeasurementRecorder product exposure', () => {
  it('persists one eligible Course fact for repeated delivery of the same exposure identity', async () => {
    const store = new MemoryMeasurementStore();
    store.eligibility.set('course:course-1', {
      productType: 'course',
      productId: 'course-1',
      status: 'published',
      lessonCount: 3,
    });
    const recorder = createMeasurementRecorder({
      store,
      isEventEnabled: async () => true,
    });
    const fact = {
      exposureId: '11111111-1111-4111-8111-111111111111',
      productType: 'course' as const,
      productId: 'course-1',
    };

    await expect(recorder.recordProductExposure(fact)).resolves.toEqual({ status: 'recorded' });
    await expect(recorder.recordProductExposure(fact)).resolves.toEqual({ status: 'duplicate' });
    expect(store.exposureIds).toEqual(new Set([fact.exposureId]));
  });

  it('records a published Bundle only when every included Course is ready', async () => {
    const store = new MemoryMeasurementStore();
    store.eligibility.set('bundle:bundle-ready', {
      productType: 'bundle',
      productId: 'bundle-ready',
      status: 'published',
      courses: [
        { id: 'course-1', status: 'published', lessonCount: 2 },
        { id: 'course-2', status: 'published', lessonCount: 1 },
      ],
    });
    store.eligibility.set('bundle:bundle-unready', {
      productType: 'bundle',
      productId: 'bundle-unready',
      status: 'published',
      courses: [
        { id: 'course-1', status: 'published', lessonCount: 0 },
      ],
    });
    const recorder = createMeasurementRecorder({ store, isEventEnabled: async () => true });

    await expect(recorder.recordProductExposure({
      exposureId: '22222222-2222-4222-8222-222222222222',
      productType: 'bundle',
      productId: 'bundle-ready',
    })).resolves.toEqual({ status: 'recorded' });
    await expect(recorder.recordProductExposure({
      exposureId: '33333333-3333-4333-8333-333333333333',
      productType: 'bundle',
      productId: 'bundle-unready',
    })).resolves.toEqual({ status: 'ineligible' });
  });

  it.each([
    ['missing Course', 'course', null],
    ['draft Course', 'course', {
      productType: 'course', productId: 'target', status: 'draft', lessonCount: 1,
    }],
    ['archived Course', 'course', {
      productType: 'course', productId: 'target', status: 'archived', lessonCount: 1,
    }],
    ['unready Course', 'course', {
      productType: 'course', productId: 'target', status: 'published', lessonCount: 0,
    }],
    ['empty Bundle', 'bundle', {
      productType: 'bundle', productId: 'target', status: 'published', courses: [],
    }],
    ['Bundle with an unpublished Course', 'bundle', {
      productType: 'bundle',
      productId: 'target',
      status: 'published',
      courses: [{ id: 'course-1', status: 'draft', lessonCount: 1 }],
    }],
  ] as const)('does not persist an ineligible %s', async (_label, productType, eligibility) => {
    const store = new MemoryMeasurementStore();
    if (eligibility) store.eligibility.set(`${productType}:target`, eligibility as ProductEligibility);
    const recorder = createMeasurementRecorder({ store, isEventEnabled: async () => true });

    await expect(recorder.recordProductExposure({
      exposureId: '44444444-4444-4444-8444-444444444444',
      productType,
      productId: 'target',
    })).resolves.toEqual({ status: 'ineligible' });
    expect(store.inserts).toBe(0);
  });

  it('stops before eligibility and persistence when product exposure analytics is disabled', async () => {
    const store = new MemoryMeasurementStore();
    const recorder = createMeasurementRecorder({ store, isEventEnabled: async () => false });

    await expect(recorder.recordProductExposure({
      exposureId: '55555555-5555-4555-8555-555555555555',
      productType: 'course',
      productId: 'course-1',
    })).resolves.toEqual({ status: 'disabled' });
    expect(store.eligibilityReads).toBe(0);
    expect(store.inserts).toBe(0);
  });

  it('rejects a non-random exposure identity before gate, eligibility, or persistence work', async () => {
    const store = new MemoryMeasurementStore();
    let gateChecks = 0;
    const recorder = createMeasurementRecorder({
      store,
      isEventEnabled: async () => {
        gateChecks += 1;
        return true;
      },
    });

    await expect(recorder.recordProductExposure({
      exposureId: 'user-1:course-1',
      productType: 'course',
      productId: 'course-1',
    })).rejects.toBeInstanceOf(MeasurementRecorderError);
    expect(gateChecks).toBe(0);
    expect(store.eligibilityReads).toBe(0);
    expect(store.inserts).toBe(0);
  });
});

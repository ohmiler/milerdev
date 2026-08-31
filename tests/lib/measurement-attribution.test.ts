import { describe, expect, it } from 'vitest';

import {
  createMeasurementRecorder,
  type MeasurementStore,
  type ProductExposureRow,
} from '@/lib/measurement-recorder';

class AttributionStore implements MeasurementStore {
  constructor(private readonly exposure: ProductExposureRow | null) {}

  async readProductEligibility() {
    return null;
  }

  async insertProductExposure() {
    return 'inserted' as const;
  }

  async readProductExposure() {
    return this.exposure;
  }
}

describe('MeasurementRecorder payment attribution', () => {
  it('returns a committed Course exposure only when its product identity matches', async () => {
    const exposureId = '11111111-1111-4111-8111-111111111111';
    const recorder = createMeasurementRecorder({
      store: new AttributionStore({
        exposureId,
        eventName: 'course_viewed',
        courseId: 'course-1',
        bundleId: null,
        placement: 'course_detail',
      }),
      isEventEnabled: async () => true,
    });

    await expect(recorder.resolveProductExposureAttribution({
      exposureId,
      productType: 'course',
      productId: 'course-1',
    })).resolves.toBe(exposureId);
  });
});

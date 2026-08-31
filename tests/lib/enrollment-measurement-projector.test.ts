import { describe, expect, it } from 'vitest';

import {
  createEnrollmentMeasurementProjector,
  type EnrollmentMeasurementStore,
  type FreeEnrollmentProjection,
} from '@/lib/enrollment-measurement-projector';

class MemoryEnrollmentMeasurementStore implements EnrollmentMeasurementStore {
  enrollment: FreeEnrollmentProjection | null = {
    enrollmentId: 'enrollment-1',
    userId: 'student-1',
    courseId: 'course-1',
  };
  hasOutbox = true;
  projected = false;
  facts = new Set<string>();
  failures = 0;
  failProjection = false;

  async readEnrollment(enrollmentId: string) {
    return this.enrollment?.enrollmentId === enrollmentId ? this.enrollment : null;
  }

  async projectPendingEnrollment(enrollment: FreeEnrollmentProjection) {
    if (this.failProjection) throw new Error('projector unavailable');
    if (!this.hasOutbox || this.projected) return 'already_projected' as const;
    const duplicate = this.facts.has(enrollment.enrollmentId);
    this.facts.add(enrollment.enrollmentId);
    this.projected = true;
    return duplicate ? 'duplicate' as const : 'projected' as const;
  }

  async recordProjectionFailure() {
    this.failures += 1;
  }
}

describe('free enrollment measurement projector', () => {
  it('projects one fact from the committed outbox identity', async () => {
    const store = new MemoryEnrollmentMeasurementStore();
    const projector = createEnrollmentMeasurementProjector({
      store,
      isEventEnabled: async () => true,
    });

    await expect(projector.projectEnrollment('enrollment-1')).resolves.toEqual({ status: 'projected' });
    expect(store.facts).toEqual(new Set(['enrollment-1']));
  });

  it('does not infer a free fact from an enrollment that has no free outbox', async () => {
    const store = new MemoryEnrollmentMeasurementStore();
    store.hasOutbox = false;
    const projector = createEnrollmentMeasurementProjector({ store, isEventEnabled: async () => true });

    await expect(projector.projectEnrollment('enrollment-1')).resolves.toEqual({ status: 'already_projected' });
    expect(store.facts.size).toBe(0);
  });

  it('keeps the outbox recoverable through a projection outage and retry', async () => {
    const store = new MemoryEnrollmentMeasurementStore();
    const projector = createEnrollmentMeasurementProjector({ store, isEventEnabled: async () => true });
    store.failProjection = true;

    await expect(projector.projectEnrollment('enrollment-1')).resolves.toEqual({ status: 'failed' });
    expect(store.failures).toBe(1);
    expect(store.enrollment).not.toBeNull();

    store.failProjection = false;
    await expect(projector.projectEnrollment('enrollment-1')).resolves.toEqual({ status: 'projected' });
    expect(store.facts).toEqual(new Set(['enrollment-1']));
  });
});

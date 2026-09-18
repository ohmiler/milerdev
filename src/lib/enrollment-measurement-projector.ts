import { eq } from 'drizzle-orm';

import { isAnalyticsEventEnabled } from '@/lib/analytics-control';
import { db } from '@/lib/db';
import { projectMeasurementOutbox, recordMeasurementProjectionFailure } from '@/lib/measurement-outbox-projection';
import { enrollments } from '@/lib/db/schema';

export type FreeEnrollmentProjection = {
  enrollmentId: string;
  userId: string;
  courseId: string;
};

export interface EnrollmentMeasurementStore {
  readEnrollment(enrollmentId: string): Promise<FreeEnrollmentProjection | null>;
  projectPendingEnrollment(
    enrollment: FreeEnrollmentProjection,
  ): Promise<'projected' | 'duplicate' | 'already_projected' | 'ineligible'>;
  recordProjectionFailure(enrollmentId: string): Promise<void>;
}

export interface EnrollmentMeasurementProjector {
  projectEnrollment(
    enrollmentId: string,
  ): Promise<{ status: 'projected' | 'duplicate' | 'already_projected' | 'disabled' | 'ineligible' | 'failed' }>;
}

export function createEnrollmentMeasurementProjector(input: {
  store: EnrollmentMeasurementStore;
  isEventEnabled(eventName: 'free_enrollment_completed'): Promise<boolean>;
}): EnrollmentMeasurementProjector {
  return {
    async projectEnrollment(enrollmentId) {
      if (!enrollmentId.trim() || enrollmentId.length > 36) return { status: 'ineligible' };

      try {
        if (!(await input.isEventEnabled('free_enrollment_completed'))) return { status: 'disabled' };
        const enrollment = await input.store.readEnrollment(enrollmentId);
        if (!enrollment) return { status: 'ineligible' };
        return { status: await input.store.projectPendingEnrollment(enrollment) };
      } catch {
        try {
          await input.store.recordProjectionFailure(enrollmentId);
        } catch {
          // Optional measurement failure never becomes enrollment authority.
        }
        return { status: 'failed' };
      }
    },
  };
}

const drizzleEnrollmentMeasurementStore: EnrollmentMeasurementStore = {
  async readEnrollment(enrollmentId) {
    const [enrollment] = await db
      .select({
        enrollmentId: enrollments.id,
        userId: enrollments.userId,
        courseId: enrollments.courseId,
      })
      .from(enrollments)
      .where(eq(enrollments.id, enrollmentId))
      .limit(1);
    return enrollment ?? null;
  },

  async projectPendingEnrollment(enrollment) {
    return projectMeasurementOutbox(db, {
      eventName: 'free_enrollment_completed', enrollmentId: enrollment.enrollmentId,
      userId: enrollment.userId, courseId: enrollment.courseId,
    });
  },

  async recordProjectionFailure(enrollmentId) {
    await recordMeasurementProjectionFailure(db, { eventName: 'free_enrollment_completed', enrollmentId });
  },
};

export const enrollmentMeasurementProjector = createEnrollmentMeasurementProjector({
  store: drizzleEnrollmentMeasurementStore,
  isEventEnabled: isAnalyticsEventEnabled,
});

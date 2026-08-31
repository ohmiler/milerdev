import { and, eq, isNull, sql } from 'drizzle-orm';

import { isAnalyticsEventEnabled } from '@/lib/analytics-control';
import { db } from '@/lib/db';
import { analyticsEvents, enrollments, measurementOutbox } from '@/lib/db/schema';
import { isDuplicateKeyError } from '@/lib/db/safe-insert';

export type FreeEnrollmentProjection = {
  enrollmentId: string;
  userId: string;
  courseId: string;
};

export interface EnrollmentMeasurementStore {
  readEnrollment(enrollmentId: string): Promise<FreeEnrollmentProjection | null>;
  projectPendingEnrollment(
    enrollment: FreeEnrollmentProjection,
  ): Promise<'projected' | 'duplicate' | 'already_projected'>;
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
    return db.transaction(async (tx) => {
      const [outbox] = await tx
        .select({ id: measurementOutbox.id, createdAt: measurementOutbox.createdAt })
        .from(measurementOutbox)
        .where(and(
          eq(measurementOutbox.eventName, 'free_enrollment_completed'),
          eq(measurementOutbox.enrollmentId, enrollment.enrollmentId),
          isNull(measurementOutbox.projectedAt),
        ))
        .limit(1);
      if (!outbox) return 'already_projected';

      let duplicate = false;
      try {
        await tx.insert(analyticsEvents).values({
          eventName: 'free_enrollment_completed',
          source: 'server',
          userId: enrollment.userId,
          courseId: enrollment.courseId,
          bundleId: null,
          paymentId: null,
          enrollmentId: enrollment.enrollmentId,
          metadata: null,
          ipAddress: null,
          userAgent: null,
          createdAt: outbox.createdAt,
        });
      } catch (error) {
        if (!isDuplicateKeyError(error)) throw error;
        duplicate = true;
      }

      await tx.update(measurementOutbox).set({
        attemptCount: sql`${measurementOutbox.attemptCount} + 1`,
        lastAttemptAt: new Date(),
        lastErrorCode: null,
        projectedAt: new Date(),
      }).where(and(
        eq(measurementOutbox.id, outbox.id),
        isNull(measurementOutbox.projectedAt),
      ));
      return duplicate ? 'duplicate' : 'projected';
    });
  },

  async recordProjectionFailure(enrollmentId) {
    await db.update(measurementOutbox).set({
      attemptCount: sql`${measurementOutbox.attemptCount} + 1`,
      lastAttemptAt: new Date(),
      lastErrorCode: 'projection_failed',
    }).where(and(
      eq(measurementOutbox.eventName, 'free_enrollment_completed'),
      eq(measurementOutbox.enrollmentId, enrollmentId),
      isNull(measurementOutbox.projectedAt),
    ));
  },
};

export const enrollmentMeasurementProjector = createEnrollmentMeasurementProjector({
  store: drizzleEnrollmentMeasurementStore,
  isEventEnabled: isAnalyticsEventEnabled,
});

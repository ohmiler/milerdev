import 'server-only';

import { and, eq, isNull, sql } from 'drizzle-orm';
import { analyticsEvents, measurementOutbox } from '@/lib/db/schema';
import { isDuplicateKeyError } from '@/lib/db/safe-insert';
import { lockActiveConsent } from '@/lib/privacy-consent';
import type { getMeasurementDatabase } from '@/lib/measurement-database';

type ProjectionDatabase = Pick<ReturnType<typeof getMeasurementDatabase>, 'transaction' | 'update'>;

export type MeasurementOutboxIdentity =
  | { eventName: 'purchase_completed'; paymentId: string }
  | { eventName: 'free_enrollment_completed'; enrollmentId: string }
  | { eventName: 'lesson_completed' | 'course_completed'; factId: string };

export type MeasurementOutboxFact =
  | {
    eventName: 'purchase_completed'; paymentId: string;
    userId: string | null; courseId: string | null; bundleId: string | null;
    attributedExposureId: string | null; method: 'stripe' | 'promptpay' | 'bank_transfer';
  }
  | {
    eventName: 'free_enrollment_completed'; enrollmentId: string;
    userId: string; courseId: string;
  }
  | {
    eventName: 'lesson_completed' | 'course_completed'; factId: string;
    courseId: string | null; learningEnrollmentId: string | null; lessonId: string | null;
  };

function pendingIdentity(identity: MeasurementOutboxIdentity) {
  const fact = identity.eventName === 'purchase_completed'
    ? eq(measurementOutbox.paymentId, identity.paymentId)
    : identity.eventName === 'free_enrollment_completed'
      ? eq(measurementOutbox.enrollmentId, identity.enrollmentId)
      : eq(measurementOutbox.learningFactId, identity.factId);
  return and(eq(measurementOutbox.eventName, identity.eventName), fact, isNull(measurementOutbox.projectedAt));
}

function eventValues(fact: MeasurementOutboxFact): typeof analyticsEvents.$inferInsert {
  const common = {
    eventName: fact.eventName, source: 'server' as const, courseId: fact.courseId,
    ipAddress: null, userAgent: null,
  };
  if (fact.eventName === 'purchase_completed') {
    return {
      ...common, userId: fact.userId, bundleId: fact.bundleId, paymentId: fact.paymentId,
      attributedExposureId: fact.attributedExposureId, metadata: JSON.stringify({ method: fact.method }),
    };
  }
  if (fact.eventName === 'free_enrollment_completed') {
    return {
      ...common, userId: fact.userId, bundleId: null, paymentId: null,
      enrollmentId: fact.enrollmentId, metadata: null,
    };
  }
  return {
    ...common, exposureId: null, userId: null, bundleId: null, paymentId: null,
    enrollmentId: null, learningFactId: fact.factId,
    learningEnrollmentId: fact.learningEnrollmentId, lessonId: fact.lessonId, metadata: null,
  };
}

// Callers establish domain eligibility. This module owns the atomic projection,
// using only the grant and timestamp captured in an existing committed outbox.
export async function projectMeasurementOutbox(
  database: ProjectionDatabase,
  fact: MeasurementOutboxFact,
): Promise<'projected' | 'duplicate' | 'already_projected' | 'ineligible'> {
  return database.transaction(async (tx) => {
    const [outbox] = await tx
      .select({ id: measurementOutbox.id, createdAt: measurementOutbox.createdAt, consentId: measurementOutbox.consentId })
      .from(measurementOutbox)
      .where(pendingIdentity(fact))
      .limit(1)
      .for('update');
    if (!outbox) return 'already_projected';
    if (!(await lockActiveConsent(tx, outbox.consentId))) return 'ineligible';

    let duplicate = false;
    try {
      await tx.insert(analyticsEvents).values({ ...eventValues(fact), createdAt: outbox.createdAt });
    } catch (error) {
      if (!isDuplicateKeyError(error)) throw error;
      duplicate = true;
    }

    await tx.update(measurementOutbox).set({
      attemptCount: sql`${measurementOutbox.attemptCount} + 1`,
      lastAttemptAt: new Date(), lastErrorCode: null, projectedAt: new Date(),
    }).where(and(eq(measurementOutbox.id, outbox.id), isNull(measurementOutbox.projectedAt)));
    return duplicate ? 'duplicate' : 'projected';
  });
}

export async function recordMeasurementProjectionFailure(
  database: ProjectionDatabase,
  identity: MeasurementOutboxIdentity,
): Promise<void> {
  await database.update(measurementOutbox).set({
    attemptCount: sql`${measurementOutbox.attemptCount} + 1`,
    lastAttemptAt: new Date(), lastErrorCode: 'projection_failed',
  }).where(pendingIdentity(identity));
}

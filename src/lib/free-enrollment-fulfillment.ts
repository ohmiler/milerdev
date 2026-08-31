import { and, eq, sql } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';

import { db } from '@/lib/db';
import { couponUsages, coupons, enrollments, measurementOutbox } from '@/lib/db/schema';
import { isDuplicateKeyError } from '@/lib/db/safe-insert';
import { enrollmentMeasurementProjector } from '@/lib/enrollment-measurement-projector';

type DatabaseTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export class FreeEnrollmentFulfillmentError extends Error {
  constructor(readonly code: 'INVALID_FREE_ENROLLMENT' | 'COUPON_LIMIT_EXCEEDED') {
    super(code);
    this.name = 'FreeEnrollmentFulfillmentError';
  }
}

type EnrollmentOutcome = { id: string; courseId: string; created: boolean };

function getAffectedRows(result: unknown): number {
  const candidate = Array.isArray(result) ? result[0] : result;
  if (!candidate || typeof candidate !== 'object' || !('affectedRows' in candidate)) return 0;
  return Number((candidate as { affectedRows: unknown }).affectedRows) || 0;
}

async function insertEnrollment(
  tx: DatabaseTransaction,
  userId: string,
  courseId: string,
): Promise<EnrollmentOutcome> {
  const id = createId();
  try {
    await tx.insert(enrollments).values({ id, userId, courseId });
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error;
    const [existing] = await tx.select({ id: enrollments.id }).from(enrollments)
      .where(and(eq(enrollments.userId, userId), eq(enrollments.courseId, courseId)))
      .limit(1);
    if (!existing) throw error;
    return { id: existing.id, courseId, created: false };
  }

  await tx.insert(measurementOutbox).values({
    eventName: 'free_enrollment_completed',
    paymentId: null,
    enrollmentId: id,
  });
  return { id, courseId, created: true };
}

export async function fulfillFreeEnrollment({
  userId,
  courseIds,
  coupon,
}: {
  userId: string;
  courseIds: string[];
  coupon?: { id: string; discountAmount: string };
}): Promise<{
  status: 'fulfilled' | 'already_fulfilled';
  created: EnrollmentOutcome[];
  existing: EnrollmentOutcome[];
}> {
  const uniqueCourseIds = [...new Set(courseIds.map((id) => id.trim()).filter(Boolean))];
  if (
    !userId.trim()
    || userId.length > 36
    || uniqueCourseIds.length === 0
    || uniqueCourseIds.some((id) => id.length > 36)
    || (coupon && uniqueCourseIds.length !== 1)
  ) {
    throw new FreeEnrollmentFulfillmentError('INVALID_FREE_ENROLLMENT');
  }

  const outcomes = await db.transaction(async (tx) => {
    const entries: EnrollmentOutcome[] = [];
    for (const courseId of uniqueCourseIds) {
      entries.push(await insertEnrollment(tx, userId, courseId));
    }

    const created = entries.filter((entry) => entry.created);
    if (coupon && created.length > 0) {
      const updateResult = await tx.update(coupons)
        .set({ usageCount: sql`${coupons.usageCount} + 1` })
        .where(and(
          eq(coupons.id, coupon.id),
          sql`(${coupons.usageLimit} IS NULL OR ${coupons.usageCount} < ${coupons.usageLimit})`,
        ));
      if (getAffectedRows(updateResult) !== 1) {
        throw new FreeEnrollmentFulfillmentError('COUPON_LIMIT_EXCEEDED');
      }
      await tx.insert(couponUsages).values({
        couponId: coupon.id,
        userId,
        courseId: uniqueCourseIds[0],
        discountAmount: coupon.discountAmount,
      });
    }
    return entries;
  });

  for (const enrollment of outcomes) {
    await enrollmentMeasurementProjector.projectEnrollment(enrollment.id);
  }
  const created = outcomes.filter((entry) => entry.created);
  return {
    status: created.length > 0 ? 'fulfilled' : 'already_fulfilled',
    created,
    existing: outcomes.filter((entry) => !entry.created),
  };
}

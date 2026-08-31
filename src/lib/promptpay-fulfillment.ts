import { and, eq, sql } from 'drizzle-orm';

import { db } from '@/lib/db';
import {
  bundleCourses,
  bundles,
  coupons,
  couponUsages,
  courses,
  enrollments,
  measurementOutbox,
  payments,
  type Payment,
} from '@/lib/db/schema';
import { isDuplicateKeyError } from '@/lib/db/safe-insert';
import { purchaseMeasurementProjector } from '@/lib/purchase-measurement-projector';
import {
  assertPromptPayIntentClaim,
  PromptPayIntentError,
} from '@/lib/promptpay-intent';

type TargetType = 'course' | 'bundle';
type DatabaseTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

function affectedRows(result: unknown): number {
  const candidate = Array.isArray(result) ? result[0] : result;
  if (!candidate || typeof candidate !== 'object' || !('affectedRows' in candidate)) return 0;
  return Number((candidate as { affectedRows: unknown }).affectedRows) || 0;
}

export async function claimPromptPayIntent({
  paymentId,
  userId,
  targetType,
  now = new Date(),
}: {
  paymentId: string;
  userId: string;
  targetType: TargetType;
  now?: Date;
}): Promise<
  | { status: 'claimed'; payment: Payment; amount: number }
  | { status: 'already_fulfilled'; payment: Payment; amount: number }
> {
  return db.transaction(async (tx) => {
    const [payment] = await tx.select().from(payments)
      .where(eq(payments.id, paymentId))
      .for('update');
    if (!payment) throw new PromptPayIntentError('PAYMENT_OWNER_MISMATCH');

    const claim = assertPromptPayIntentClaim(payment, { userId, targetType, now });
    if (claim.status === 'already_fulfilled') {
      return { status: claim.status, payment, amount: claim.amount };
    }

    const updateResult = await tx.update(payments).set({ status: 'verifying' })
      .where(and(eq(payments.id, payment.id), eq(payments.status, 'pending')));
    if (affectedRows(updateResult) !== 1) {
      throw new PromptPayIntentError('PAYMENT_STATUS_VERIFYING');
    }
    return { status: 'claimed', payment: { ...payment, status: 'verifying' }, amount: claim.amount };
  });
}

export async function releasePromptPayIntent(paymentId: string): Promise<void> {
  await db.update(payments).set({ status: 'pending' })
    .where(and(eq(payments.id, paymentId), eq(payments.status, 'verifying')));
}

async function insertEnrollment(
  tx: DatabaseTransaction,
  userId: string,
  courseId: string,
): Promise<boolean> {
  try {
    await tx.insert(enrollments).values({ userId, courseId });
    return true;
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error;
    return false;
  }
}

export async function fulfillPromptPayIntent({
  paymentId,
  userId,
  promptpayTransRef,
}: {
  paymentId: string;
  userId: string;
  promptpayTransRef: string;
}): Promise<{
  status: 'fulfilled' | 'already_fulfilled';
  payment: Payment;
  enrolledCount: number;
  emailDetails: { title: string; firstCourseSlug: string; courseCount?: number } | null;
}> {
  if (!promptpayTransRef || promptpayTransRef.length > 255) {
    throw new Error('PROMPTPAY_REFERENCE_INVALID');
  }

  const result = await db.transaction(async (tx) => {
    const [payment] = await tx.select().from(payments)
      .where(eq(payments.id, paymentId))
      .for('update');
    if (!payment || payment.userId !== userId || payment.method !== 'promptpay') {
      throw new Error('PAYMENT_IDENTITY_MISMATCH');
    }
    if (payment.status === 'completed') {
      return {
        status: 'already_fulfilled' as const,
        payment,
        enrolledCount: 0,
        emailDetails: null,
      };
    }
    if (payment.status !== 'verifying') throw new Error('PAYMENT_STATE_RACE');
    if (Boolean(payment.courseId) === Boolean(payment.bundleId)) {
      throw new Error('PAYMENT_TARGET_INVALID');
    }

    const updateResult = await tx.update(payments).set({
      status: 'completed',
      promptpayTransRef,
      slipUrl: promptpayTransRef,
    }).where(and(eq(payments.id, payment.id), eq(payments.status, 'verifying')));
    if (affectedRows(updateResult) !== 1) throw new Error('PAYMENT_STATE_RACE');

    let enrolledCount = 0;
    let emailDetails: { title: string; firstCourseSlug: string; courseCount?: number } | null = null;
    if (payment.courseId) {
      if (await insertEnrollment(tx, userId, payment.courseId)) enrolledCount += 1;
      const [course] = await tx.select({ title: courses.title, slug: courses.slug })
        .from(courses).where(eq(courses.id, payment.courseId)).limit(1);
      if (course) emailDetails = { title: course.title, firstCourseSlug: course.slug };
    } else if (payment.bundleId) {
      const includedCourses = await tx.select({
        courseId: bundleCourses.courseId,
        courseSlug: courses.slug,
      }).from(bundleCourses)
        .innerJoin(courses, eq(bundleCourses.courseId, courses.id))
        .where(eq(bundleCourses.bundleId, payment.bundleId));
      if (includedCourses.length === 0) throw new Error('BUNDLE_HAS_NO_COURSES');
      for (const course of includedCourses) {
        if (await insertEnrollment(tx, userId, course.courseId)) enrolledCount += 1;
      }
      const [bundle] = await tx.select({ title: bundles.title })
        .from(bundles).where(eq(bundles.id, payment.bundleId)).limit(1);
      if (bundle) {
        emailDetails = {
          title: bundle.title,
          firstCourseSlug: includedCourses[0]?.courseSlug ?? '',
          courseCount: includedCourses.length,
        };
      }
    }

    if (payment.couponId && payment.courseId) {
      const [coupon] = await tx.select({ id: coupons.id }).from(coupons)
        .where(eq(coupons.id, payment.couponId)).limit(1);
      if (coupon) {
        let inserted = false;
        try {
          await tx.insert(couponUsages).values({
            couponId: coupon.id,
            userId,
            courseId: payment.courseId,
            discountAmount: '0',
          });
          inserted = true;
        } catch (error) {
          if (!isDuplicateKeyError(error)) throw error;
        }
        if (inserted) {
          await tx.update(coupons).set({ usageCount: sql`${coupons.usageCount} + 1` })
            .where(eq(coupons.id, coupon.id));
        }
      }
    }

    await tx.insert(measurementOutbox).values({
      eventName: 'purchase_completed',
      paymentId: payment.id,
    });

    return {
      status: 'fulfilled' as const,
      payment: { ...payment, status: 'completed' as const, promptpayTransRef, slipUrl: promptpayTransRef },
      enrolledCount,
      emailDetails,
    };
  });

  await purchaseMeasurementProjector.projectPurchase(result.payment.id);
  return result;
}

import Stripe from 'stripe';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  bundleCourses,
  bundles,
  auditLogs,
  coupons,
  couponUsages,
  courses,
  enrollments,
  payments,
  measurementOutbox,
  stripeEvents,
  type Payment,
} from '@/lib/db/schema';
import { isDuplicateKeyError } from '@/lib/db/safe-insert';
import { purchaseMeasurementProjector } from '@/lib/purchase-measurement-projector';

type PaymentTarget =
  | { type: 'course'; itemId: string }
  | { type: 'bundle'; itemId: string };

export type ExpectedStripePayment = PaymentTarget & { userId: string };

interface StripeEventIdentity {
  id: string;
  type: string;
}

interface FulfillmentEmailDetails {
  title: string;
  courseCount?: number;
  firstCourseSlug: string;
}

export type StripeFulfillmentResult =
  | {
      status: 'fulfilled' | 'already_fulfilled';
      payment: Payment;
      emailDetails: FulfillmentEmailDetails | null;
    }
  | { status: 'replayed' }
  | { status: 'rejected'; code: string; retryable: boolean };

class FulfillmentRejection extends Error {
  constructor(
    readonly code: string,
    readonly retryable: boolean = false,
  ) {
    super(code);
    this.name = 'FulfillmentRejection';
  }
}

function reject(code: string, retryable = false): never {
  throw new FulfillmentRejection(code, retryable);
}

function decimalToMinorUnits(value: string): number | null {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value);
  if (!match) return null;

  const whole = BigInt(match[1]);
  const fraction = BigInt((match[2] ?? '').padEnd(2, '0'));
  const minorUnits = whole * BigInt(100) + fraction;
  if (minorUnits > BigInt(Number.MAX_SAFE_INTEGER)) return null;
  return Number(minorUnits);
}

function getAffectedRows(result: unknown): number | null {
  const candidate = Array.isArray(result) ? result[0] : result;
  if (!candidate || typeof candidate !== 'object' || !('affectedRows' in candidate)) {
    return null;
  }
  const affectedRows = Number((candidate as { affectedRows: unknown }).affectedRows);
  return Number.isFinite(affectedRows) ? affectedRows : null;
}

function getPaymentIntentId(session: Stripe.Checkout.Session): string | null {
  if (typeof session.payment_intent === 'string') return session.payment_intent;
  if (session.payment_intent && typeof session.payment_intent.id === 'string') {
    return session.payment_intent.id;
  }
  return null;
}

function readSessionIdentity(
  session: Stripe.Checkout.Session,
  expected?: ExpectedStripePayment,
): { paymentId: string; userId: string; target: PaymentTarget; couponId?: string } {
  const metadata = session.metadata ?? {};
  const paymentId = metadata.paymentId;
  const userId = metadata.userId;
  const type = metadata.type;

  if (!paymentId || !userId || (type !== 'course' && type !== 'bundle')) {
    reject('INVALID_METADATA');
  }

  const itemId = type === 'course' ? metadata.courseId : metadata.bundleId;
  if (!itemId) reject('INVALID_TARGET_METADATA');

  if (
    expected
    && (expected.userId !== userId || expected.type !== type || expected.itemId !== itemId)
  ) {
    reject('EXPECTED_TARGET_MISMATCH');
  }

  return {
    paymentId,
    userId,
    target: { type, itemId } as PaymentTarget,
    ...(metadata.couponId ? { couponId: metadata.couponId } : {}),
  };
}

async function insertEnrollment(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
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

/**
 * The single authority for turning a paid Stripe Checkout Session into access.
 * Metadata identifies an immutable local payment attempt; the database row is
 * then checked again and transitioned together with entitlement writes.
 */
export async function fulfillStripeCheckoutSession({
  session,
  event,
  expected,
}: {
  session: Stripe.Checkout.Session;
  event?: StripeEventIdentity;
  expected?: ExpectedStripePayment;
}): Promise<StripeFulfillmentResult> {
  if (session.payment_status !== 'paid') {
    return { status: 'rejected', code: 'SESSION_NOT_PAID', retryable: true };
  }

  let identity: ReturnType<typeof readSessionIdentity>;
  try {
    identity = readSessionIdentity(session, expected);
  } catch (error) {
    if (error instanceof FulfillmentRejection) {
      return { status: 'rejected', code: error.code, retryable: error.retryable };
    }
    throw error;
  }

  const stripeAmount = session.amount_total;
  const stripeCurrency = session.currency?.toLowerCase();
  const paymentIntentId = getPaymentIntentId(session);
  if (!Number.isSafeInteger(stripeAmount) || stripeAmount === null || !stripeCurrency || !paymentIntentId) {
    return { status: 'rejected', code: 'INCOMPLETE_STRIPE_PAYMENT', retryable: true };
  }

  try {
    const result: Extract<StripeFulfillmentResult, { payment: Payment }> = await db.transaction(
      async (tx) => {
      if (event) {
        if (!event.id || !event.type) reject('INVALID_EVENT');
        await tx.insert(stripeEvents).values({
          id: event.id,
          type: event.type,
          paymentId: identity.paymentId,
          processedAt: new Date(),
        });
      }

      const [payment] = await tx
        .select()
        .from(payments)
        .where(eq(payments.id, identity.paymentId))
        .limit(1);

      if (!payment) reject('PAYMENT_NOT_FOUND', true);
      if (payment.method !== 'stripe') reject('PAYMENT_METHOD_MISMATCH');
      if (payment.userId !== identity.userId) reject('PAYMENT_OWNER_MISMATCH');

      const isCourse = identity.target.type === 'course';
      if (
        (isCourse && (payment.courseId !== identity.target.itemId || payment.bundleId !== null))
        || (!isCourse && (payment.bundleId !== identity.target.itemId || payment.courseId !== null))
      ) {
        reject('PAYMENT_TARGET_MISMATCH');
      }

      const databaseAmount = decimalToMinorUnits(payment.amount.toString());
      if (databaseAmount === null || databaseAmount !== stripeAmount) {
        reject('PAYMENT_AMOUNT_MISMATCH');
      }
      if (payment.currency.toLowerCase() !== stripeCurrency) {
        reject('PAYMENT_CURRENCY_MISMATCH');
      }

      if (payment.status === 'refunded' || payment.status === 'failed' || payment.status === 'verifying') {
        reject(`PAYMENT_STATUS_${payment.status.toUpperCase()}`);
      }
      if (payment.status !== 'pending' && payment.status !== 'completed') {
        reject('PAYMENT_STATUS_INVALID');
      }
      if (payment.status === 'completed' && payment.stripePaymentId && payment.stripePaymentId !== paymentIntentId) {
        reject('PAYMENT_INTENT_MISMATCH');
      }

      const wasCompleted = payment.status === 'completed';
      if (!wasCompleted) {
        const updateResult = await tx
          .update(payments)
          .set({ status: 'completed', stripePaymentId: paymentIntentId })
          .where(and(eq(payments.id, payment.id), eq(payments.status, 'pending')));
        if (getAffectedRows(updateResult) !== 1) reject('PAYMENT_STATE_RACE', true);
      }

      let emailDetails: FulfillmentEmailDetails | null = null;
      if (identity.target.type === 'course') {
        await insertEnrollment(tx, identity.userId, identity.target.itemId);
        const course = await tx.query.courses.findFirst({
          where: eq(courses.id, identity.target.itemId),
        });
        if (course) {
          emailDetails = { title: course.title, firstCourseSlug: course.slug };
        }
      } else {
        const includedCourses = await tx
          .select({ courseId: bundleCourses.courseId, courseSlug: courses.slug })
          .from(bundleCourses)
          .innerJoin(courses, eq(bundleCourses.courseId, courses.id))
          .where(eq(bundleCourses.bundleId, identity.target.itemId));

        for (const includedCourse of includedCourses) {
          await insertEnrollment(tx, identity.userId, includedCourse.courseId);
        }

        const [bundle] = await tx
          .select()
          .from(bundles)
          .where(eq(bundles.id, identity.target.itemId))
          .limit(1);
        if (bundle) {
          emailDetails = {
            title: bundle.title,
            courseCount: includedCourses.length,
            firstCourseSlug: includedCourses[0]?.courseSlug ?? '',
          };
        }
      }

      if (identity.couponId) {
        const [coupon] = await tx
          .select({ id: coupons.id })
          .from(coupons)
          .where(eq(coupons.id, identity.couponId))
          .limit(1);

        if (coupon) {
          let usageCreated = false;
          try {
            await tx.insert(couponUsages).values({
              couponId: identity.couponId,
              userId: identity.userId,
              ...(identity.target.type === 'course' && { courseId: identity.target.itemId }),
              discountAmount: '0',
            });
            usageCreated = true;
          } catch (error) {
            if (!isDuplicateKeyError(error)) throw error;
          }

          if (usageCreated) {
            await tx
              .update(coupons)
              .set({ usageCount: sql`${coupons.usageCount} + 1` })
              .where(eq(coupons.id, identity.couponId));
          }
        }
      }

      if (!wasCompleted) {
        await tx.insert(measurementOutbox).values({
          eventName: 'purchase_completed',
          paymentId: payment.id,
        });
      }

      return {
        status: wasCompleted ? 'already_fulfilled' : 'fulfilled',
        payment: { ...payment, status: 'completed', stripePaymentId: paymentIntentId },
        emailDetails,
      };
    });

    await purchaseMeasurementProjector.projectPurchase(result.payment.id);
    return result;
  } catch (error) {
    if (event && isDuplicateKeyError(error)) {
      await purchaseMeasurementProjector.projectPurchase(identity.paymentId);
      return { status: 'replayed' };
    }
    if (error instanceof FulfillmentRejection) {
      return { status: 'rejected', code: error.code, retryable: error.retryable };
    }
    throw error;
  }
}

export type ManualPaymentFulfillmentResult =
  | { status: 'fulfilled' | 'already_fulfilled'; payment: Payment; enrolledCount: number }
  | { status: 'rejected'; code: string; retryable: boolean };

/** Complete a non-Stripe payment from an explicit, audited admin action. */
export async function fulfillManualPayment({
  paymentId,
  allowedMethod,
  actorId,
  reason,
}: {
  paymentId: string;
  allowedMethod?: 'promptpay' | 'bank_transfer';
  actorId: string;
  reason: string;
}): Promise<ManualPaymentFulfillmentResult> {
  if (!actorId || reason.trim().length < 5) {
    return { status: 'rejected', code: 'INVALID_AUDIT_CONTEXT', retryable: false };
  }

  try {
    const result: Extract<ManualPaymentFulfillmentResult, { payment: Payment }> = await db.transaction(async (tx) => {
      const [payment] = await tx
        .select()
        .from(payments)
        .where(eq(payments.id, paymentId))
        .limit(1);

      if (!payment) reject('PAYMENT_NOT_FOUND');
      if (payment.method === 'stripe') reject('STRIPE_MANUAL_COMPLETION_FORBIDDEN');
      if (allowedMethod && payment.method !== allowedMethod) reject('PAYMENT_METHOD_MISMATCH');
      if (!payment.userId) reject('PAYMENT_OWNER_MISSING');
      if (!!payment.courseId === !!payment.bundleId) reject('PAYMENT_TARGET_INVALID');
      if (payment.status === 'refunded') reject('PAYMENT_STATUS_REFUNDED');
      if (payment.status === 'completed') {
        return { status: 'already_fulfilled', payment, enrolledCount: 0 };
      }
      if (!['pending', 'verifying', 'failed'].includes(payment.status)) {
        reject('PAYMENT_STATUS_INVALID');
      }

      const updateResult = await tx
        .update(payments)
        .set({
          status: 'completed',
          retryCount: (payment.retryCount ?? 0) + 1,
          lastRetryAt: new Date(),
        })
        .where(and(eq(payments.id, payment.id), eq(payments.status, payment.status)));
      if (getAffectedRows(updateResult) !== 1) reject('PAYMENT_STATE_RACE', true);

      let enrolledCount = 0;
      if (payment.courseId) {
        if (await insertEnrollment(tx, payment.userId, payment.courseId)) enrolledCount += 1;
      } else if (payment.bundleId) {
        const includedCourses = await tx
          .select({ courseId: bundleCourses.courseId })
          .from(bundleCourses)
          .where(eq(bundleCourses.bundleId, payment.bundleId));
        if (includedCourses.length === 0) reject('BUNDLE_HAS_NO_COURSES');

        for (const includedCourse of includedCourses) {
          if (await insertEnrollment(tx, payment.userId, includedCourse.courseId)) enrolledCount += 1;
        }
      }

      await tx.insert(auditLogs).values({
        userId: actorId,
        action: 'update',
        entityType: 'payment',
        entityId: payment.id,
        oldValue: `status: ${payment.status}`,
        newValue: `status: completed; manual approval; reason: ${reason.trim()}`,
      });

      await tx.insert(measurementOutbox).values({
        eventName: 'purchase_completed',
        paymentId: payment.id,
      });

      return {
        status: 'fulfilled',
        payment: { ...payment, status: 'completed' },
        enrolledCount,
      };
    });

    await purchaseMeasurementProjector.projectPurchase(result.payment.id);
    return result;
  } catch (error) {
    if (error instanceof FulfillmentRejection) {
      return { status: 'rejected', code: error.code, retryable: error.retryable };
    }
    throw error;
  }
}

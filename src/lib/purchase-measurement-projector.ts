import { and, eq, isNull, sql } from 'drizzle-orm';

import { isAnalyticsEventEnabled } from '@/lib/analytics-control';
import { db } from '@/lib/db';
import { analyticsEvents, measurementOutbox, payments } from '@/lib/db/schema';
import { isDuplicateKeyError } from '@/lib/db/safe-insert';

export type PurchaseProjection = {
  paymentId: string;
  userId: string | null;
  courseId: string | null;
  bundleId: string | null;
  method: 'stripe' | 'promptpay' | 'bank_transfer';
  status: 'pending' | 'completed' | 'failed' | 'refunded' | 'verifying';
  amount: string;
  attributedExposureId: string | null;
};

export interface PurchaseMeasurementStore {
  readCompletedPayment(paymentId: string): Promise<PurchaseProjection | null>;
  ensurePurchaseOutbox(paymentId: string): Promise<void>;
  projectPendingPurchase(
    payment: PurchaseProjection,
  ): Promise<'projected' | 'duplicate' | 'already_projected'>;
  recordProjectionFailure(paymentId: string): Promise<void>;
}

export interface PurchaseMeasurementProjector {
  projectPurchase(
    paymentId: string,
  ): Promise<{ status: 'projected' | 'duplicate' | 'already_projected' | 'disabled' | 'ineligible' | 'failed' }>;
}

function isEligiblePaidPurchase(payment: PurchaseProjection | null): payment is PurchaseProjection {
  const amount = Number(payment?.amount);
  return Boolean(
    payment
    && payment.status === 'completed'
    && payment.userId
    && Boolean(payment.courseId) !== Boolean(payment.bundleId)
    && Number.isFinite(amount)
    && amount > 0
  );
}

export function createPurchaseMeasurementProjector(input: {
  store: PurchaseMeasurementStore;
  isEventEnabled(eventName: 'purchase_completed'): Promise<boolean>;
}): PurchaseMeasurementProjector {
  return {
    async projectPurchase(paymentId) {
      if (!paymentId.trim() || paymentId.length > 36) return { status: 'ineligible' };

      try {
        if (!(await input.isEventEnabled('purchase_completed'))) return { status: 'disabled' };

        const payment = await input.store.readCompletedPayment(paymentId);
        if (!isEligiblePaidPurchase(payment)) return { status: 'ineligible' };

        await input.store.ensurePurchaseOutbox(paymentId);
        const status = await input.store.projectPendingPurchase(payment);
        return { status };
      } catch {
        try {
          await input.store.recordProjectionFailure(paymentId);
        } catch {
          // Measurement recovery remains best-effort and never becomes payment authority.
        }
        return { status: 'failed' };
      }
    },
  };
}

const drizzlePurchaseMeasurementStore: PurchaseMeasurementStore = {
  async readCompletedPayment(paymentId) {
    const [payment] = await db
      .select({
        paymentId: payments.id,
        userId: payments.userId,
        courseId: payments.courseId,
        bundleId: payments.bundleId,
        method: payments.method,
        status: payments.status,
        amount: payments.amount,
        attributedExposureId: payments.attributedExposureId,
      })
      .from(payments)
      .where(eq(payments.id, paymentId))
      .limit(1);
    return payment ?? null;
  },

  async ensurePurchaseOutbox(paymentId) {
    try {
      await db.insert(measurementOutbox).values({
        eventName: 'purchase_completed',
        paymentId,
      });
    } catch (error) {
      if (!isDuplicateKeyError(error)) throw error;
    }
  },

  async projectPendingPurchase(payment) {
    return db.transaction(async (tx) => {
      const [outbox] = await tx
        .select({ id: measurementOutbox.id, createdAt: measurementOutbox.createdAt })
        .from(measurementOutbox)
        .where(and(
          eq(measurementOutbox.eventName, 'purchase_completed'),
          eq(measurementOutbox.paymentId, payment.paymentId),
          isNull(measurementOutbox.projectedAt),
        ))
        .limit(1);

      if (!outbox) return 'already_projected';

      let duplicate = false;
      try {
        await tx.insert(analyticsEvents).values({
          eventName: 'purchase_completed',
          attributedExposureId: payment.attributedExposureId,
          source: 'server',
          userId: payment.userId,
          courseId: payment.courseId,
          bundleId: payment.bundleId,
          paymentId: payment.paymentId,
          metadata: JSON.stringify({ method: payment.method }),
          ipAddress: null,
          userAgent: null,
          createdAt: outbox.createdAt,
        });
      } catch (error) {
        if (!isDuplicateKeyError(error)) throw error;
        duplicate = true;
      }

      await tx
        .update(measurementOutbox)
        .set({
          attemptCount: sql`${measurementOutbox.attemptCount} + 1`,
          lastAttemptAt: new Date(),
          lastErrorCode: null,
          projectedAt: new Date(),
        })
        .where(and(
          eq(measurementOutbox.id, outbox.id),
          isNull(measurementOutbox.projectedAt),
        ));

      return duplicate ? 'duplicate' : 'projected';
    });
  },

  async recordProjectionFailure(paymentId) {
    await db
      .update(measurementOutbox)
      .set({
        attemptCount: sql`${measurementOutbox.attemptCount} + 1`,
        lastAttemptAt: new Date(),
        lastErrorCode: 'projection_failed',
      })
      .where(and(
        eq(measurementOutbox.eventName, 'purchase_completed'),
        eq(measurementOutbox.paymentId, paymentId),
        isNull(measurementOutbox.projectedAt),
      ));
  },
};

export const purchaseMeasurementProjector = createPurchaseMeasurementProjector({
  store: drizzlePurchaseMeasurementStore,
  isEventEnabled: isAnalyticsEventEnabled,
});

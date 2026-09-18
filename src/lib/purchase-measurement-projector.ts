import { eq } from 'drizzle-orm';

import { isAnalyticsEventEnabled } from '@/lib/analytics-control';
import { db } from '@/lib/db';
import { projectMeasurementOutbox, recordMeasurementProjectionFailure } from '@/lib/measurement-outbox-projection';
import { payments } from '@/lib/db/schema';

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
  // Project only an existing committed outbox; never backfill old payments.
  projectPendingPurchase(
    payment: PurchaseProjection,
  ): Promise<'projected' | 'duplicate' | 'already_projected' | 'ineligible'>;
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

  async projectPendingPurchase(payment) {
    return projectMeasurementOutbox(db, {
      eventName: 'purchase_completed', paymentId: payment.paymentId,
      userId: payment.userId, courseId: payment.courseId, bundleId: payment.bundleId,
      attributedExposureId: payment.attributedExposureId, method: payment.method,
    });
  },

  async recordProjectionFailure(paymentId) {
    await recordMeasurementProjectionFailure(db, { eventName: 'purchase_completed', paymentId });
  },
};

export const purchaseMeasurementProjector = createPurchaseMeasurementProjector({
  store: drizzlePurchaseMeasurementStore,
  isEventEnabled: isAnalyticsEventEnabled,
});

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { dbTransaction, insertedRows, paymentState, projectPurchase, isDuplicateKeyError } = vi.hoisted(() => ({
  dbTransaction: vi.fn(),
  insertedRows: [] as Array<Record<string, unknown>>,
  paymentState: { status: 'pending' as 'pending' | 'completed' },
  projectPurchase: vi.fn(),
  isDuplicateKeyError: vi.fn(),
}));

vi.mock('@/lib/db/safe-insert', () => ({
  isDuplicateKeyError,
}));
vi.mock('@/lib/db', () => ({ db: { transaction: dbTransaction } }));
vi.mock('@/lib/purchase-measurement-projector', () => ({
  purchaseMeasurementProjector: { projectPurchase },
}));

import { fulfillStripeCheckoutSession } from '@/lib/payment-fulfillment';

const payment = () => ({
  id: 'pay-1',
  userId: 'user-1',
  courseId: 'course-1',
  bundleId: null,
  couponId: null,
  attributedExposureId: '11111111-1111-4111-8111-111111111111',
  amount: '990.00',
  currency: 'THB',
  method: 'stripe',
  stripePaymentId: paymentState.status === 'completed' ? 'pi_test' : null,
  slipUrl: null,
  promptpayTransRef: null,
  itemTitle: 'Course One',
  status: paymentState.status,
  retryCount: 0,
  lastRetryAt: null,
  createdAt: new Date('2026-08-31T08:00:00.000Z'),
});

const session = {
  metadata: {
    paymentId: 'pay-1',
    userId: 'user-1',
    courseId: 'course-1',
    type: 'course',
  },
  payment_intent: 'pi_test',
  payment_status: 'paid',
  amount_total: 99_000,
  currency: 'thb',
};

function transactionAdapter() {
  return {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([payment()]) })),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({ where: vi.fn().mockResolvedValue([{ affectedRows: 1 }]) })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(async (row: Record<string, unknown>) => {
        insertedRows.push(row);
      }),
    })),
    query: {
      courses: {
        findFirst: vi.fn().mockResolvedValue({ title: 'Course One', slug: 'course-one' }),
      },
    },
  };
}

describe('Stripe purchase transactional outbox', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertedRows.length = 0;
    paymentState.status = 'pending';
    projectPurchase.mockResolvedValue({ status: 'projected' });
    isDuplicateKeyError.mockReturnValue(false);
    dbTransaction.mockImplementation(async (work) => work(transactionAdapter()));
  });

  it('enqueues one purchase fact with the first committed pending-to-completed transition', async () => {
    const result = await fulfillStripeCheckoutSession({ session: session as never });

    expect(result.status).toBe('fulfilled');
    expect(insertedRows).toContainEqual(expect.objectContaining({
      eventName: 'purchase_completed',
      paymentId: 'pay-1',
    }));
    expect(projectPurchase).toHaveBeenCalledWith('pay-1');
  });

  it('keeps fulfillment successful when projection fails after the domain commit', async () => {
    projectPurchase.mockResolvedValue({ status: 'failed' });

    const result = await fulfillStripeCheckoutSession({ session: session as never });

    expect(result.status).toBe('fulfilled');
    expect(insertedRows).toContainEqual(expect.objectContaining({
      eventName: 'purchase_completed', paymentId: 'pay-1',
    }));
  });

  it('does not enqueue a second purchase fact for an already-fulfilled success-page render', async () => {
    paymentState.status = 'completed';

    const result = await fulfillStripeCheckoutSession({ session: session as never });

    expect(result.status).toBe('already_fulfilled');
    expect(insertedRows).not.toContainEqual(expect.objectContaining({
      eventName: 'purchase_completed',
      paymentId: 'pay-1',
    }));
    expect(projectPurchase).toHaveBeenCalledWith('pay-1');
  });

  it('uses a duplicate webhook only to reconcile the original payment fact', async () => {
    isDuplicateKeyError.mockReturnValue(true);
    dbTransaction.mockRejectedValue(new Error('duplicate Stripe event'));

    const result = await fulfillStripeCheckoutSession({
      session: session as never,
      event: { id: 'evt-1', type: 'checkout.session.completed' },
    });

    expect(result).toEqual({ status: 'replayed' });
    expect(insertedRows).toHaveLength(0);
    expect(projectPurchase).toHaveBeenCalledTimes(1);
    expect(projectPurchase).toHaveBeenCalledWith('pay-1');
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { dbTransaction, insertedRows, paymentState, isDuplicateKeyError } = vi.hoisted(() => ({
  dbTransaction: vi.fn(),
  insertedRows: [] as Array<Record<string, unknown>>,
  paymentState: { status: 'pending' as 'pending' | 'completed' },
  isDuplicateKeyError: vi.fn(),
}));

vi.mock('@/lib/db/safe-insert', () => ({
  isDuplicateKeyError,
}));
vi.mock('@/lib/db', () => ({ db: { transaction: dbTransaction } }));

import { fulfillStripeCheckoutSession } from '@/lib/commerce/payment-fulfillment';

const payment = () => ({
  id: 'pay-1',
  userId: 'user-1',
  courseId: 'course-1',
  bundleId: null,
  couponId: null,
  attributedExposureId: null,
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

describe('Stripe checkout fulfillment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertedRows.length = 0;
    paymentState.status = 'pending';
    isDuplicateKeyError.mockReturnValue(false);
    dbTransaction.mockImplementation(async (work) => work(transactionAdapter()));
  });

  it('grants access on the first pending-to-completed transition and writes no measurement fact', async () => {
    const result = await fulfillStripeCheckoutSession({ session: session as never });

    expect(result.status).toBe('fulfilled');
    expect(insertedRows).toContainEqual(expect.objectContaining({ userId: 'user-1', courseId: 'course-1' }));
    expect(insertedRows.some((row) => row.eventName)).toBe(false);
  });

  it('reports an already-fulfilled success-page render without granting again', async () => {
    paymentState.status = 'completed';

    const result = await fulfillStripeCheckoutSession({ session: session as never });

    expect(result.status).toBe('already_fulfilled');
    expect(insertedRows.some((row) => row.eventName)).toBe(false);
  });

  it('treats a duplicate webhook event as a replay', async () => {
    isDuplicateKeyError.mockReturnValue(true);
    dbTransaction.mockRejectedValue(new Error('duplicate Stripe event'));

    const result = await fulfillStripeCheckoutSession({
      session: session as never,
      event: { id: 'evt-1', type: 'checkout.session.completed' },
    });

    expect(result).toEqual({ status: 'replayed' });
    expect(insertedRows).toHaveLength(0);
  });
});

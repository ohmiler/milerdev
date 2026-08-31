import { beforeEach, describe, expect, it, vi } from 'vitest';

const { projectPurchase } = vi.hoisted(() => ({
  projectPurchase: vi.fn(),
}));

const selectQueue: unknown[][] = [];
const inserted: unknown[] = [];
const updates: unknown[] = [];

function queryChain(result: unknown[]) {
  const chain: Record<string, unknown> = {};
  for (const method of ['from', 'innerJoin', 'where']) chain[method] = vi.fn(() => chain);
  chain.limit = vi.fn(() => Promise.resolve(result));
  chain.for = vi.fn(() => Promise.resolve(result));
  chain.then = (resolve: (value: unknown[]) => unknown) => Promise.resolve(resolve(result));
  return chain;
}

const tx = {
  select: vi.fn(() => queryChain(selectQueue.shift() ?? [])),
  update: vi.fn(() => ({
    set: vi.fn((value: unknown) => {
      updates.push(value);
      return { where: vi.fn(() => Promise.resolve([{ affectedRows: 1 }])) };
    }),
  })),
  insert: vi.fn(() => ({
    values: vi.fn((value: unknown) => {
      inserted.push(value);
      return Promise.resolve();
    }),
  })),
};

vi.mock('@/lib/db', () => ({
  db: {
    transaction: vi.fn((work: (transaction: typeof tx) => unknown) => work(tx)),
  },
}));

vi.mock('@/lib/purchase-measurement-projector', () => ({
  purchaseMeasurementProjector: { projectPurchase },
}));
import { fulfillPromptPayIntent } from '@/lib/promptpay-fulfillment';

const payment = {
  id: 'payment-1',
  userId: 'student-1',
  courseId: 'course-archived',
  bundleId: null,
  couponId: null,
  amount: '990.00',
  currency: 'THB',
  method: 'promptpay',
  status: 'verifying',
  stripePaymentId: null,
  slipUrl: null,
  promptpayTransRef: null,
  itemTitle: 'Archived Course',
  retryCount: 0,
  lastRetryAt: null,
  createdAt: new Date(),
};

describe('PromptPay fulfillment after course retirement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectQueue.length = 0;
    inserted.length = 0;
    updates.length = 0;
    projectPurchase.mockResolvedValue({ status: 'projected' });
  });

  it('fulfills a previously accepted intent without rechecking publication status', async () => {
    selectQueue.push(
      [payment],
      [{ title: 'Archived Course', slug: 'archived-course', status: 'archived' }],
    );

    const result = await fulfillPromptPayIntent({
      paymentId: 'payment-1',
      userId: 'student-1',
      promptpayTransRef: 'provider-ref-1',
    });

    expect(result.status).toBe('fulfilled');
    expect(updates).toContainEqual(expect.objectContaining({
      status: 'completed',
      promptpayTransRef: 'provider-ref-1',
    }));
    expect(inserted).toContainEqual(expect.objectContaining({
      userId: 'student-1',
      courseId: 'course-archived',
    }));
    expect(inserted).toContainEqual(expect.objectContaining({
      eventName: 'purchase_completed',
      paymentId: 'payment-1',
    }));
    expect(projectPurchase).toHaveBeenCalledWith('payment-1');
  });

  it('returns an idempotent result for an already-completed owner retry', async () => {
    selectQueue.push([{ ...payment, status: 'completed', promptpayTransRef: 'provider-ref-1' }]);

    const result = await fulfillPromptPayIntent({
      paymentId: 'payment-1',
      userId: 'student-1',
      promptpayTransRef: 'provider-ref-1',
    });

    expect(result.status).toBe('already_fulfilled');
    expect(updates).toHaveLength(0);
    expect(inserted).toHaveLength(0);
    expect(projectPurchase).toHaveBeenCalledWith('payment-1');
  });

  it('does not reverse fulfillment when purchase projection is unavailable after commit', async () => {
    projectPurchase.mockResolvedValue({ status: 'failed' });
    selectQueue.push(
      [payment],
      [{ title: 'Archived Course', slug: 'archived-course', status: 'archived' }],
    );

    const result = await fulfillPromptPayIntent({
      paymentId: 'payment-1',
      userId: 'student-1',
      promptpayTransRef: 'provider-ref-1',
    });

    expect(result.status).toBe('fulfilled');
    expect(inserted).toContainEqual(expect.objectContaining({
      eventName: 'purchase_completed',
      paymentId: 'payment-1',
    }));
    expect(projectPurchase).toHaveBeenCalledWith('payment-1');
  });
});

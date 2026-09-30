import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadPaymentReturn } from '@/lib/payment-return';
import { paymentRecord } from '../fixtures/payment-record';

const mocks = vi.hoisted(() => ({ product: vi.fn(), retrieve: vi.fn(), fulfill: vi.fn(), record: vi.fn() }));
vi.mock('@/lib/db', () => ({ db: { query: { courses: { findFirst: mocks.product }, bundles: { findFirst: mocks.product } } } }));
vi.mock('@/lib/stripe', () => ({ stripe: { checkout: { sessions: { retrieve: mocks.retrieve } } } }));
vi.mock('@/lib/payment-fulfillment', () => ({ fulfillStripeCheckoutSession: mocks.fulfill }));
vi.mock('@/lib/payment-records', () => ({ loadPaymentRecord: mocks.record }));
const session = { id: 'cs_test_return', payment_status: 'paid', metadata: { paymentId: 'attempt-1', userId: 'member-1', type: 'course', courseId: 'course-1' } };
beforeEach(() => {
  vi.resetAllMocks();
  mocks.product.mockResolvedValue({ id: 'course-1', title: 'ชื่อปัจจุบัน', slug: 'thai' });
  mocks.retrieve.mockResolvedValue(session);
  mocks.record.mockResolvedValue(paymentRecord({ status: 'completed' }, 1));
  mocks.fulfill.mockResolvedValue({ status: 'already_fulfilled' });
});

describe.each(['course', 'bundle'] as const)('%s exact Stripe return', (type) => {
  function configure() {
    const id = type === 'course' ? 'course-1' : 'bundle-1';
    mocks.product.mockResolvedValue({ id, title: 'ชื่อใหม่', slug: 'thai' });
    mocks.retrieve.mockResolvedValue({ ...session, metadata: { paymentId: 'attempt-1', userId: 'member-1', type, ...(type === 'course' ? { courseId: id } : { bundleId: id }) } });
    const record = paymentRecord({ status: 'completed', ...(type === 'bundle' ? { courseId: null, bundleId: id } : {}) }, type === 'bundle' ? 2 : 1);
    mocks.record.mockResolvedValue(record);
    return record;
  }
  it('replays strict fulfillment even when already enrolled and re-reads the exact snapshot', async () => {
    const record = configure();
    const result = await loadPaymentReturn('member-1', type, 'thai', 'cs_test_return');
    expect(result).toEqual(record);
    expect(mocks.fulfill).toHaveBeenCalledWith({ session: expect.any(Object), expected: { userId: 'member-1', type, itemId: record.presentation.target.id } });
    expect(mocks.record.mock.calls).toEqual([['member-1', 'attempt-1'], ['member-1', 'attempt-1']]);
  });
  it('shows unconfirmed without a session, never another latest attempt or catalog price', async () => {
    configure();
    const result = await loadPaymentReturn('member-1', type, 'thai');
    expect(result?.presentation).toMatchObject({ quote: null, attempt: null, payment: { state: 'unconfirmed' } });
    expect(mocks.retrieve).not.toHaveBeenCalled();
    expect(mocks.record).not.toHaveBeenCalled();
  });
  it('fails closed on provider failure or rejected amount/ownership validation', async () => {
    configure(); mocks.retrieve.mockRejectedValueOnce(new Error('provider unavailable'));
    expect((await loadPaymentReturn('member-1', type, 'thai', 'cs_test_return'))?.presentation.payment.state).toBe('unconfirmed');
    configure(); mocks.fulfill.mockResolvedValue({ status: 'rejected', code: 'PAYMENT_AMOUNT_MISMATCH' });
    expect((await loadPaymentReturn('member-1', type, 'thai', 'cs_test_return'))?.presentation.quote).toBeNull();
  });
});
it.each([{ userId: 'other' }, { courseId: 'other' }, { type: 'bundle' }])('rejects mismatched Stripe identity %j before private reads or fulfillment', async (metadata) => {
  mocks.retrieve.mockResolvedValue({ ...session, metadata: { ...session.metadata, ...metadata } });
  expect((await loadPaymentReturn('member-1', 'course', 'thai', 'cs_test_return'))?.presentation.payment.state).toBe('unconfirmed');
  expect(mocks.record).not.toHaveBeenCalled();
  expect(mocks.fulfill).not.toHaveBeenCalled();
});
it('does not fulfill an unpaid return and reflects completed access pending independently', async () => {
  mocks.retrieve.mockResolvedValue({ ...session, payment_status: 'unpaid' });
  mocks.record.mockResolvedValue(paymentRecord({ status: 'completed' }));
  expect((await loadPaymentReturn('member-1', 'course', 'thai', 'cs_test_return'))?.presentation.payment.state).toBe('completed-access-pending');
  expect(mocks.fulfill).not.toHaveBeenCalled();
});
it('does not use a PromptPay attempt referenced by Stripe metadata', async () => {
  mocks.record.mockResolvedValue(paymentRecord({ method: 'promptpay' }));
  expect((await loadPaymentReturn('member-1', 'course', 'thai', 'cs_test_return'))?.presentation.payment.state).toBe('unconfirmed');
  expect(mocks.fulfill).not.toHaveBeenCalled();
});

it.each(['failed', 'refunded'] as const)('keeps the exact local %s state and never retries fulfillment', async (status) => {
  const record = paymentRecord({ status });
  mocks.record.mockResolvedValue(record);
  expect(await loadPaymentReturn('member-1', 'course', 'thai', 'cs_test_return')).toEqual(record);
  expect(mocks.fulfill).not.toHaveBeenCalled();
});

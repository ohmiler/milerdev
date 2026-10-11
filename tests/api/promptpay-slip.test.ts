import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));
vi.mock('@/lib/security/rate-limit', () => ({
  checkRateLimit: vi.fn(() => ({ success: true, resetTime: Date.now() + 60_000 })),
  rateLimits: { sensitive: { maxRequests: 10, windowMs: 60_000 } },
  rateLimitResponse: vi.fn(),
}));
vi.mock('@/lib/notifications/email', () => ({
  sendEnrollmentEmail: vi.fn(() => Promise.resolve()),
  sendPaymentConfirmation: vi.fn(() => Promise.resolve()),
}));
vi.mock('@/lib/error-handler', () => ({ logError: vi.fn() }));
vi.mock('@/lib/commerce/promptpay-fulfillment', () => ({
  claimPromptPayIntent: vi.fn(),
  fulfillPromptPayIntent: vi.fn(),
  releasePromptPayIntent: vi.fn(() => Promise.resolve()),
}));

import { auth } from '@/lib/auth';
import {
  claimPromptPayIntent,
  fulfillPromptPayIntent,
  releasePromptPayIntent,
} from '@/lib/commerce/promptpay-fulfillment';
import { PromptPayIntentError } from '@/lib/commerce/promptpay-intent';

const session = {
  user: { id: 'student-1', name: 'Student', email: 'student@example.test' },
};

function slipRequest(paymentId?: string) {
  const formData = new FormData();
  formData.append('slip', new File(['image'], 'slip.png', { type: 'image/png' }));
  if (paymentId) formData.append('paymentId', paymentId);
  return new Request('http://localhost/api/slip/verify', { method: 'POST', body: formData });
}

const HOUR = 60 * 60 * 1000;
const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60 * 1000);

function claimed(paymentId = 'payment-1', createdAt = minutesAgo(5)) {
  vi.mocked(claimPromptPayIntent).mockResolvedValue({
    status: 'claimed',
    amount: 990,
    payment: { id: paymentId, createdAt },
  } as never);
}

// A fresh Response per call: a body can be read only once.
function slipOk(body: unknown) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(JSON.stringify(body)));
}

const paidNow = (overrides: Record<string, unknown> = {}) => ({
  success: true,
  data: { amount: 990, transRef: 'ref-1', transTimestamp: minutesAgo(1).toISOString(), ...overrides },
});

describe('PromptPay slip verification boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue(session as never);
  });

  it('requires paymentId and never accepts a client amount or target as authority', async () => {
    const { POST } = await import('@/app/api/slip/verify/route');
    const response = await POST(slipRequest());

    expect(response.status).toBe(400);
    expect(claimPromptPayIntent).not.toHaveBeenCalled();
  });

  it('rejects a foreign intent before calling SlipOK', async () => {
    vi.mocked(claimPromptPayIntent).mockRejectedValue(
      new PromptPayIntentError('PAYMENT_OWNER_MISMATCH'),
    );
    const provider = vi.spyOn(globalThis, 'fetch');
    const { POST } = await import('@/app/api/slip/verify/route');
    const response = await POST(slipRequest('payment-foreign'));

    expect(response.status).toBe(404);
    expect(provider).not.toHaveBeenCalled();
    provider.mockRestore();
  });

  it('uses the immutable intent amount and fulfills exactly that claimed payment', async () => {
    claimed();
    vi.mocked(fulfillPromptPayIntent).mockResolvedValue({
      status: 'fulfilled',
      payment: { id: 'payment-1', amount: '990.00' },
      enrolledCount: 1,
      emailDetails: null,
    } as never);
    const provider = slipOk(paidNow());

    const { POST } = await import('@/app/api/slip/verify/route');
    const response = await POST(slipRequest('payment-1'));

    expect(response.status).toBe(200);
    const providerBody = provider.mock.calls[0]?.[1]?.body as FormData;
    expect(providerBody.get('amount')).toBe('990');
    // log=true is what makes SlipOK check the receiver account and reject repeated slips.
    expect(providerBody.get('log')).toBe('true');
    expect(fulfillPromptPayIntent).toHaveBeenCalledWith({
      paymentId: 'payment-1',
      userId: 'student-1',
      promptpayTransRef: 'ref-1',
    });
    provider.mockRestore();
  });

  it('releases the claim when provider evidence is invalid or underpaid', async () => {
    claimed();
    const provider = slipOk(paidNow({ amount: 100 }));

    const { POST } = await import('@/app/api/slip/verify/route');
    const response = await POST(slipRequest('payment-1'));

    expect(response.status).toBe(400);
    expect(releasePromptPayIntent).toHaveBeenCalledWith('payment-1');
    expect(fulfillPromptPayIntent).not.toHaveBeenCalled();
    provider.mockRestore();
  });

  it('answers an owner replay from completed local state without another provider call', async () => {
    vi.mocked(claimPromptPayIntent).mockResolvedValue({
      status: 'already_fulfilled',
      amount: 990,
      payment: { id: 'payment-1' },
    } as never);
    const provider = vi.spyOn(globalThis, 'fetch');

    const { POST } = await import('@/app/api/slip/verify/route');
    const response = await POST(slipRequest('payment-1'));

    expect(response.status).toBe(200);
    expect(provider).not.toHaveBeenCalled();
    provider.mockRestore();
  });

  it('releases a competing intent when the provider reference is already consumed', async () => {
    claimed('payment-2');
    vi.mocked(fulfillPromptPayIntent).mockRejectedValue(
      new Error('ER_DUP_ENTRY: provider reference already consumed'),
    );
    const provider = slipOk(paidNow());

    const { POST } = await import('@/app/api/slip/verify/route');
    const response = await POST(slipRequest('payment-2'));

    expect(response.status).toBe(400);
    expect(releasePromptPayIntent).toHaveBeenCalledWith('payment-2');
    provider.mockRestore();
  });
});

describe('PromptPay slip receiver and transfer time', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue(session as never);
    vi.mocked(fulfillPromptPayIntent).mockResolvedValue({
      status: 'fulfilled',
      payment: { id: 'payment-1', amount: '990.00' },
      enrolledCount: 1,
      emailDetails: null,
    } as never);
  });

  const routes = [
    ['course', '@/app/api/slip/verify/route'],
    ['bundle', '@/app/api/bundles/slip/verify/route'],
  ] as const;

  it.each(routes)('%s: explains a slip that SlipOK says was not paid to the shop account', async (_target, path) => {
    claimed();
    const provider = slipOk({ success: false, code: 1014, message: 'บัญชีผู้รับไม่ตรงกับบัญชีหลักของร้าน' });

    const { POST } = await import(path);
    const response = await POST(slipRequest('payment-1'));

    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe('สลิปนี้ไม่ได้โอนเข้าบัญชีของ MilerDev กรุณาตรวจสอบบัญชีปลายทาง');
    expect(releasePromptPayIntent).toHaveBeenCalledWith('payment-1');
    expect(fulfillPromptPayIntent).not.toHaveBeenCalled();
    provider.mockRestore();
  });

  it.each(routes)('%s: rejects a transfer made more than a day before the payment attempt', async (_target, path) => {
    claimed('payment-1', minutesAgo(10));
    const provider = slipOk(paidNow({ transTimestamp: new Date(Date.now() - 25 * HOUR).toISOString() }));

    const { POST } = await import(path);
    const response = await POST(slipRequest('payment-1'));

    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe('สลิปนี้โอนไว้นานก่อนสร้างรายการชำระเงิน กรุณาใช้สลิปของรายการนี้');
    expect(releasePromptPayIntent).toHaveBeenCalledWith('payment-1');
    expect(fulfillPromptPayIntent).not.toHaveBeenCalled();
    provider.mockRestore();
  });

  it('accepts a transfer made before a retried payment attempt, within a day', async () => {
    // The buyer paid, let the first 30-minute attempt expire, and uploaded the slip to a new one.
    claimed('payment-1', minutesAgo(10));
    const provider = slipOk(paidNow({ transTimestamp: new Date(Date.now() - 20 * HOUR).toISOString() }));

    const { POST } = await import('@/app/api/slip/verify/route');
    const response = await POST(slipRequest('payment-1'));

    expect(response.status).toBe(200);
    expect(fulfillPromptPayIntent).toHaveBeenCalledWith(expect.objectContaining({ promptpayTransRef: 'ref-1' }));
    provider.mockRestore();
  });

  it('rejects a slip whose transfer time is in the future', async () => {
    claimed();
    const provider = slipOk(paidNow({ transTimestamp: new Date(Date.now() + HOUR).toISOString() }));

    const { POST } = await import('@/app/api/slip/verify/route');
    const response = await POST(slipRequest('payment-1'));

    expect(response.status).toBe(400);
    expect(releasePromptPayIntent).toHaveBeenCalledWith('payment-1');
    expect(fulfillPromptPayIntent).not.toHaveBeenCalled();
    provider.mockRestore();
  });

  it('rejects a slip with no readable transfer time', async () => {
    claimed();
    const provider = slipOk({ success: true, data: { amount: 990, transRef: 'ref-1' } });

    const { POST } = await import('@/app/api/slip/verify/route');
    const response = await POST(slipRequest('payment-1'));

    expect(response.status).toBe(400);
    expect(releasePromptPayIntent).toHaveBeenCalledWith('payment-1');
    expect(fulfillPromptPayIntent).not.toHaveBeenCalled();
    provider.mockRestore();
  });
});

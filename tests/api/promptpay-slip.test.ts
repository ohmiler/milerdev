import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn(() => ({ success: true, resetTime: Date.now() + 60_000 })),
  rateLimits: { sensitive: { maxRequests: 10, windowMs: 60_000 } },
  rateLimitResponse: vi.fn(),
}));
vi.mock('@/lib/email', () => ({
  sendEnrollmentEmail: vi.fn(() => Promise.resolve()),
  sendPaymentConfirmation: vi.fn(() => Promise.resolve()),
}));
vi.mock('@/lib/error-handler', () => ({ logError: vi.fn() }));
vi.mock('@/lib/promptpay-fulfillment', () => ({
  claimPromptPayIntent: vi.fn(),
  fulfillPromptPayIntent: vi.fn(),
  releasePromptPayIntent: vi.fn(() => Promise.resolve()),
}));

import { auth } from '@/lib/auth';
import {
  claimPromptPayIntent,
  fulfillPromptPayIntent,
  releasePromptPayIntent,
} from '@/lib/promptpay-fulfillment';
import { PromptPayIntentError } from '@/lib/promptpay-intent';

const session = {
  user: { id: 'student-1', name: 'Student', email: 'student@example.test' },
};

function slipRequest(paymentId?: string) {
  const formData = new FormData();
  formData.append('slip', new File(['image'], 'slip.png', { type: 'image/png' }));
  if (paymentId) formData.append('paymentId', paymentId);
  return new Request('http://localhost/api/slip/verify', { method: 'POST', body: formData });
}

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
    vi.mocked(claimPromptPayIntent).mockResolvedValue({
      status: 'claimed',
      amount: 990,
      payment: { id: 'payment-1' },
    } as never);
    vi.mocked(fulfillPromptPayIntent).mockResolvedValue({
      status: 'fulfilled',
      payment: { id: 'payment-1', amount: '990.00' },
      enrolledCount: 1,
      emailDetails: null,
    } as never);
    const provider = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: { amount: 990, transRef: 'ref-1' } })),
    );

    const { POST } = await import('@/app/api/slip/verify/route');
    const response = await POST(slipRequest('payment-1'));

    expect(response.status).toBe(200);
    const providerBody = provider.mock.calls[0]?.[1]?.body as FormData;
    expect(providerBody.get('amount')).toBe('990');
    expect(fulfillPromptPayIntent).toHaveBeenCalledWith({
      paymentId: 'payment-1',
      userId: 'student-1',
      promptpayTransRef: 'ref-1',
    });
    provider.mockRestore();
  });

  it('releases the claim when provider evidence is invalid or underpaid', async () => {
    vi.mocked(claimPromptPayIntent).mockResolvedValue({
      status: 'claimed',
      amount: 990,
      payment: { id: 'payment-1' },
    } as never);
    const provider = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: { amount: 100, transRef: 'ref-1' } })),
    );

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
    vi.mocked(claimPromptPayIntent).mockResolvedValue({
      status: 'claimed',
      amount: 990,
      payment: { id: 'payment-2' },
    } as never);
    vi.mocked(fulfillPromptPayIntent).mockRejectedValue(
      new Error('ER_DUP_ENTRY: provider reference already consumed'),
    );
    const provider = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: { amount: 990, transRef: 'ref-1' } })),
    );

    const { POST } = await import('@/app/api/slip/verify/route');
    const response = await POST(slipRequest('payment-2'));

    expect(response.status).toBe(400);
    expect(releasePromptPayIntent).toHaveBeenCalledWith('payment-2');
    provider.mockRestore();
  });
});

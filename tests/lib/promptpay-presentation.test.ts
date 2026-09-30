import { beforeEach, expect, it, vi } from 'vitest';
import { loadPromptPayPresentation } from '@/lib/promptpay-presentation';
import { paymentRecord } from '../fixtures/payment-record';

const mocks = vi.hoisted(() => ({ load: vi.fn() }));
vi.mock('@/lib/payment-records', () => ({ loadPaymentRecord: mocks.load }));
beforeEach(() => vi.resetAllMocks());
it('uses the same owner-checked eligibility as payment history', async () => {
  const record = { ...paymentRecord({ method: 'promptpay' }), canSubmitSlip: true };
  mocks.load.mockResolvedValue(record);
  expect(await loadPromptPayPresentation('member-1', 'attempt-1')).toEqual({ presentation: record.presentation, canSubmitSlip: true });
  expect(mocks.load).toHaveBeenCalledWith('member-1', 'attempt-1');
});
it('does not expose missing or non-PromptPay attempts', async () => {
  mocks.load.mockResolvedValueOnce(null).mockResolvedValueOnce(paymentRecord());
  expect(await loadPromptPayPresentation('other', 'attempt-1')).toBeNull();
  expect(await loadPromptPayPresentation('member-1', 'attempt-1')).toBeNull();
});

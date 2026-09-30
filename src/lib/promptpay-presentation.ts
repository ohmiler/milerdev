import 'server-only';

import { loadPaymentRecord } from '@/lib/payment-records';

export async function loadPromptPayPresentation(userId: string, paymentId: string) {
  const record = await loadPaymentRecord(userId, paymentId);
  if (record?.presentation.attempt?.method !== 'promptpay') return null;
  return { presentation: record.presentation, canSubmitSlip: record.canSubmitSlip };
}

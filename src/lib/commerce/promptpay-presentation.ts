import 'server-only';

import { loadPaymentRecord } from '@/lib/commerce/payment-records';

export async function loadPromptPayPresentation(userId: string, paymentId: string) {
  const record = await loadPaymentRecord(userId, paymentId);
  if (record?.presentation.attempt?.method !== 'promptpay') return null;
  return { presentation: record.presentation, canSubmitSlip: record.canSubmitSlip };
}

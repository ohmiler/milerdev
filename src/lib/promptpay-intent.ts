export const PROMPTPAY_INTENT_TTL_MS = 30 * 60 * 1000;

type PromptPayIntentStatus =
  | 'pending'
  | 'completed'
  | 'failed'
  | 'refunded'
  | 'verifying';

export type PromptPayIntentRecord = {
  id: string;
  userId: string | null;
  courseId: string | null;
  bundleId: string | null;
  amount: string;
  currency: string;
  method: 'stripe' | 'promptpay' | 'bank_transfer';
  status: PromptPayIntentStatus;
  createdAt: Date | null;
};

export type PromptPayIntentErrorCode =
  | 'PAYMENT_OWNER_MISMATCH'
  | 'PAYMENT_METHOD_MISMATCH'
  | 'PAYMENT_TARGET_MISMATCH'
  | 'PAYMENT_INTENT_EXPIRED'
  | 'PAYMENT_AMOUNT_INVALID'
  | `PAYMENT_STATUS_${Uppercase<PromptPayIntentStatus>}`;

export class PromptPayIntentError extends Error {
  constructor(readonly code: PromptPayIntentErrorCode) {
    super(code);
    this.name = 'PromptPayIntentError';
  }
}

function fail(code: PromptPayIntentErrorCode): never {
  throw new PromptPayIntentError(code);
}

export function assertPromptPayIntentClaim(
  payment: PromptPayIntentRecord,
  {
    userId,
    targetType,
    now = new Date(),
  }: {
    userId: string;
    targetType: 'course' | 'bundle';
    now?: Date;
  },
): { status: 'claimable' | 'already_fulfilled'; amount: number } {
  if (payment.userId !== userId) fail('PAYMENT_OWNER_MISMATCH');
  if (payment.method !== 'promptpay') fail('PAYMENT_METHOD_MISMATCH');

  const hasCourse = Boolean(payment.courseId);
  const hasBundle = Boolean(payment.bundleId);
  if (
    hasCourse === hasBundle
    || (targetType === 'course' && !hasCourse)
    || (targetType === 'bundle' && !hasBundle)
  ) {
    fail('PAYMENT_TARGET_MISMATCH');
  }

  const amount = Number(payment.amount);
  if (!Number.isFinite(amount) || amount <= 0 || payment.currency !== 'THB') {
    fail('PAYMENT_AMOUNT_INVALID');
  }

  if (payment.status === 'completed') {
    return { status: 'already_fulfilled', amount };
  }
  if (payment.status !== 'pending') {
    fail(`PAYMENT_STATUS_${payment.status.toUpperCase()}` as PromptPayIntentErrorCode);
  }

  if (
    !payment.createdAt
    || now.getTime() - payment.createdAt.getTime() >= PROMPTPAY_INTENT_TTL_MS
    || payment.createdAt.getTime() > now.getTime()
  ) {
    fail('PAYMENT_INTENT_EXPIRED');
  }

  return { status: 'claimable', amount };
}

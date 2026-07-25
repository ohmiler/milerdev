import { describe, expect, it } from 'vitest';

import {
  PROMPTPAY_INTENT_TTL_MS,
  assertPromptPayIntentClaim,
} from '@/lib/promptpay-intent';

const now = new Date('2026-07-25T00:30:00.000Z');
const pendingIntent = {
  id: 'payment-1',
  userId: 'student-1',
  courseId: 'course-1',
  bundleId: null,
  amount: '990.00',
  currency: 'THB',
  method: 'promptpay' as const,
  status: 'pending' as const,
  createdAt: new Date(now.getTime() - PROMPTPAY_INTENT_TTL_MS + 1),
};

describe('PromptPay intent claim contract', () => {
  it('accepts the owner-bound immutable target within 30 minutes', () => {
    expect(assertPromptPayIntentClaim(pendingIntent, {
      userId: 'student-1',
      targetType: 'course',
      now,
    })).toEqual({ status: 'claimable', amount: 990 });
  });

  it.each([
    { patch: { userId: 'student-2' }, code: 'PAYMENT_OWNER_MISMATCH' },
    { patch: { method: 'stripe' as const }, code: 'PAYMENT_METHOD_MISMATCH' },
    { patch: { bundleId: 'bundle-1', courseId: null }, code: 'PAYMENT_TARGET_MISMATCH' },
    { patch: { status: 'failed' as const }, code: 'PAYMENT_STATUS_FAILED' },
    { patch: { createdAt: new Date(now.getTime() - PROMPTPAY_INTENT_TTL_MS) }, code: 'PAYMENT_INTENT_EXPIRED' },
  ])('rejects altered, foreign, invalid, or expired intent: $code', ({ patch, code }) => {
    expect(() => assertPromptPayIntentClaim({ ...pendingIntent, ...patch }, {
      userId: 'student-1',
      targetType: 'course',
      now,
    })).toThrowError(expect.objectContaining({ code }));
  });

  it('treats an owner retry of a completed intent as already fulfilled', () => {
    expect(assertPromptPayIntentClaim({ ...pendingIntent, status: 'completed' }, {
      userId: 'student-1',
      targetType: 'course',
      now,
    })).toEqual({ status: 'already_fulfilled', amount: 990 });
  });
});

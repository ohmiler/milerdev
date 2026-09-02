import { describe, expect, it } from 'vitest';

import {
  derivePaymentPresentation,
  type ServerPaymentAttempt,
} from '@/lib/payment-presentation';

const NOW = new Date('2026-09-02T07:00:00.000Z');

function deriveWithAttempt(attemptOverride: Partial<ServerPaymentAttempt>) {
  return derivePaymentPresentation({
    kind: 'exact-attempt',
    ownerId: 'user-1',
    expectedAttemptId: 'payment-course-1',
    target: {
      type: 'course',
      id: 'course-1',
      title: 'ชื่อคอร์สปัจจุบัน',
      href: '/courses/typescript',
    },
    attempt: {
      id: 'payment-course-1',
      userId: 'user-1',
      courseId: 'course-1',
      bundleId: null,
      itemTitle: 'TypeScript Foundations ตอนที่ซื้อ',
      amount: '990.00',
      currency: 'THB',
      method: 'stripe',
      status: 'pending',
      createdAt: new Date('2026-09-02T06:55:00.000Z'),
      ...attemptOverride,
    },
    access: { enrolledCount: 0, totalCount: 1 },
  }, { now: NOW });
}

describe('PaymentPresentation exact-attempt validation', () => {
  it.each([
    ['attempt identity', { id: 'payment-other' }],
    ['owner', { userId: 'user-other' }],
    ['target', { courseId: 'course-other' }],
    ['amount', { amount: 'not-an-amount' }],
    ['currency', { currency: 'USD' }],
  ] satisfies Array<[string, Partial<ServerPaymentAttempt>]>) (
    'does not expose an attempt when its %s is not server-valid',
    (_, attemptOverride) => {
      const presentation = deriveWithAttempt(attemptOverride);

      expect(presentation).toMatchObject({
        quote: null,
        attempt: null,
        payment: {
          state: 'unconfirmed',
          isConfirmed: false,
          label: 'ยังยืนยันรายการนี้ไม่ได้',
          preventDuplicatePayment: true,
        },
        recovery: {
          kind: 'view-history',
          href: '/dashboard/payments',
        },
      });
    },
  );

  it('rejects a method outside the server schema instead of displaying it', () => {
    const presentation = deriveWithAttempt({
      method: 'client-invented' as ServerPaymentAttempt['method'],
    });

    expect(presentation.payment.state).toBe('unconfirmed');
    expect(presentation.attempt).toBeNull();
  });
});

import { describe, expect, it } from 'vitest';

import { derivePaymentPresentation } from '@/lib/payment-presentation';

const NOW = new Date('2026-09-02T07:00:00.000Z');

describe('PaymentPresentation', () => {
  it('presents the exact pending Stripe Course attempt without claiming payment or access', () => {
    const presentation = derivePaymentPresentation({
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
      },
      access: { enrolledCount: 0, totalCount: 1 },
    }, { now: NOW });

    expect(presentation).toMatchObject({
      target: {
        type: 'course',
        id: 'course-1',
        title: 'TypeScript Foundations ตอนที่ซื้อ',
      },
      quote: {
        amountDue: '990.00',
        amountFormatted: '฿990.00',
        currency: 'THB',
      },
      attempt: {
        id: 'payment-course-1',
        method: 'stripe',
        rawStatus: 'pending',
      },
      payment: {
        state: 'pending',
        isConfirmed: false,
        label: 'ยังชำระไม่เสร็จ',
        preventDuplicatePayment: false,
      },
      access: { state: 'none', enrolledCount: 0, totalCount: 1 },
      recovery: {
        kind: 'restart',
        label: 'กลับไปเลือกวิธีชำระเงิน',
        href: '/courses/typescript',
      },
    });
  });
});

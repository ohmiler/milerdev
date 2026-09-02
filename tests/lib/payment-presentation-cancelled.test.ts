import { describe, expect, it } from 'vitest';

import { derivePaymentPresentation } from '@/lib/payment-presentation';

describe('PaymentPresentation cancelled return', () => {
  it('keeps selected product context without inventing an attempt or current-price proof', () => {
    const presentation = derivePaymentPresentation({
      kind: 'cancelled-return',
      target: {
        type: 'course',
        id: 'course-1',
        title: 'TypeScript Foundations',
        href: '/courses/typescript',
      },
      access: { enrolledCount: 0, totalCount: 1 },
    }, { now: new Date('2026-09-02T07:00:00.000Z') });

    expect(presentation).toMatchObject({
      target: { type: 'course', id: 'course-1', title: 'TypeScript Foundations' },
      quote: null,
      attempt: null,
      payment: {
        state: 'cancelled-return',
        isConfirmed: false,
        label: 'ยกเลิกการชำระแล้ว',
        preventDuplicatePayment: false,
      },
      recovery: {
        kind: 'restart',
        label: 'เลือกวิธีชำระเงินใหม่',
        href: '/courses/typescript',
      },
    });
  });
});

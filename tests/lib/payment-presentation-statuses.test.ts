import { describe, expect, it } from 'vitest';

import {
  derivePaymentPresentation,
  type ServerPaymentAttempt,
} from '@/lib/payment-presentation';

const NOW = new Date('2026-09-02T07:00:00.000Z');

function present({
  status,
  method = 'stripe',
  createdAt = new Date('2026-09-02T06:55:00.000Z'),
  enrolledCount = 0,
  totalCount = 1,
}: {
  status: ServerPaymentAttempt['status'];
  method?: ServerPaymentAttempt['method'];
  createdAt?: Date | null;
  enrolledCount?: number;
  totalCount?: number;
}) {
  return derivePaymentPresentation({
    kind: 'exact-attempt',
    ownerId: 'user-1',
    expectedAttemptId: 'payment-1',
    target: {
      type: 'course',
      id: 'course-1',
      title: 'ชื่อปัจจุบัน',
      href: '/courses/typescript',
    },
    attempt: {
      id: 'payment-1',
      userId: 'user-1',
      courseId: 'course-1',
      bundleId: null,
      itemTitle: 'TypeScript ตอนที่ซื้อ',
      amount: '1990.00',
      currency: 'THB',
      method,
      status,
      createdAt,
    },
    access: { enrolledCount, totalCount },
  }, { now: NOW });
}

describe('PaymentPresentation status matrix', () => {
  it('distinguishes active and expired PromptPay pending attempts', () => {
    const active = present({ status: 'pending', method: 'promptpay' });
    const expired = present({
      status: 'pending',
      method: 'promptpay',
      createdAt: new Date('2026-09-02T06:00:00.000Z'),
    });

    expect(active).toMatchObject({
      attempt: { expiresAt: '2026-09-02T07:25:00.000Z' },
      payment: {
        state: 'pending',
        label: 'รอแนบสลิป',
        preventDuplicatePayment: true,
      },
      recovery: { kind: 'contact', label: 'ติดต่อพร้อมเลขอ้างอิง' },
    });
    expect(expired).toMatchObject({
      payment: {
        state: 'pending',
        label: 'รายการหมดเวลา',
        preventDuplicatePayment: false,
      },
      recovery: { kind: 'restart', label: 'เริ่มรายการใหม่' },
    });
  });

  it.each([
    ['verifying', 0, 'verifying', false, 'กำลังตรวจสอบสลิป', true, 'refresh'],
    ['completed', 1, 'completed-ready', true, 'ชำระแล้ว · พร้อมเรียน', true, 'continue-learning'],
    ['completed', 0, 'completed-access-pending', true, 'ชำระแล้ว · กำลังเปิดสิทธิ์', true, 'refresh'],
    ['failed', 0, 'failed', false, 'ชำระเงินไม่สำเร็จ', false, 'restart'],
    ['refunded', 0, 'refunded', false, 'คืนเงินแล้ว', true, 'view-product'],
  ] as const)(
    'maps %s with access count %s to a distinct descriptor and recovery',
    (status, enrolledCount, state, isConfirmed, label, preventDuplicatePayment, recoveryKind) => {
      const presentation = present({ status, enrolledCount });

      expect(presentation.payment).toMatchObject({
        state,
        isConfirmed,
        label,
        preventDuplicatePayment,
      });
      expect(presentation.recovery.kind).toBe(recoveryKind);
    },
  );
});

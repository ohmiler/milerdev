import { describe, expect, it } from 'vitest';

import {
  derivePaymentPresentation,
  type ServerPaymentAttempt,
} from '@/lib/payment-presentation';

const NOW = new Date('2026-09-02T07:00:00.000Z');

describe('PaymentPresentation representative consumers', () => {
  it('keeps a confirmed Bundle payment separate from partial access readiness', () => {
    const presentation = derivePaymentPresentation({
      kind: 'exact-attempt',
      ownerId: 'user-1',
      expectedAttemptId: 'payment-bundle-1',
      target: {
        type: 'bundle',
        id: 'bundle-1',
        title: 'ชื่อ Bundle ปัจจุบัน',
        href: '/bundles/full-stack',
      },
      attempt: {
        id: 'payment-bundle-1',
        userId: 'user-1',
        courseId: null,
        bundleId: 'bundle-1',
        itemTitle: 'Full Stack Bundle ตอนที่ซื้อ',
        amount: '4990.00',
        currency: 'THB',
        method: 'stripe',
        status: 'completed',
        createdAt: new Date('2026-09-02T06:55:00.000Z'),
      },
      access: { enrolledCount: 2, totalCount: 3 },
    }, { now: NOW });

    expect(presentation).toMatchObject({
      target: { type: 'bundle', title: 'Full Stack Bundle ตอนที่ซื้อ' },
      quote: { amountDue: '4990.00' },
      payment: { state: 'completed-access-pending', isConfirmed: true },
      access: { state: 'partial', enrolledCount: 2, totalCount: 3 },
      recovery: { kind: 'refresh' },
    });
  });

  it('lets payment history present each same-product attempt by its own immutable identity and amount', () => {
    const attempts: ServerPaymentAttempt[] = [
      {
        id: 'payment-old',
        userId: 'user-1',
        courseId: 'course-1',
        bundleId: null,
        itemTitle: 'TypeScript รอบราคาเดิม',
        amount: '990.00',
        currency: 'THB',
        method: 'stripe',
        status: 'completed',
        createdAt: new Date('2026-08-01T00:00:00.000Z'),
      },
      {
        id: 'payment-new',
        userId: 'user-1',
        courseId: 'course-1',
        bundleId: null,
        itemTitle: 'TypeScript รอบราคาปัจจุบัน',
        amount: '1290.00',
        currency: 'THB',
        method: 'stripe',
        status: 'pending',
        createdAt: new Date('2026-09-02T06:55:00.000Z'),
      },
    ];

    const presentations = attempts.map((attempt) => derivePaymentPresentation({
      kind: 'exact-attempt',
      ownerId: 'user-1',
      expectedAttemptId: attempt.id,
      target: {
        type: 'course',
        id: 'course-1',
        title: 'ชื่อคอร์สใน catalog วันนี้',
        href: '/courses/typescript',
      },
      attempt,
      access: { enrolledCount: attempt.status === 'completed' ? 1 : 0, totalCount: 1 },
    }, { now: NOW }));

    expect(presentations.map((presentation) => ({
      id: presentation.attempt?.id,
      amount: presentation.quote?.amountDue,
      title: presentation.target.title,
      state: presentation.payment.state,
    }))).toEqual([
      {
        id: 'payment-old',
        amount: '990.00',
        title: 'TypeScript รอบราคาเดิม',
        state: 'completed-ready',
      },
      {
        id: 'payment-new',
        amount: '1290.00',
        title: 'TypeScript รอบราคาปัจจุบัน',
        state: 'pending',
      },
    ]);
  });
});

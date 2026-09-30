import { derivePaymentPresentation, type ServerPaymentAttempt } from '@/lib/payment-presentation';
import type { PaymentRecord } from '@/lib/payment-records';

export function paymentRecord(overrides: Partial<ServerPaymentAttempt> = {}, enrolledCount = 0): PaymentRecord {
  const attempt: ServerPaymentAttempt = {
    id: 'attempt-1', userId: 'member-1', courseId: 'course-1', bundleId: null,
    itemTitle: 'ชื่อสินค้าตอนชำระเงิน', amount: '990.25', currency: 'THB', method: 'stripe', status: 'pending', createdAt: new Date(), ...overrides,
  };
  return { id: attempt.id, canSubmitSlip: false, presentation: derivePaymentPresentation({
    kind: 'exact-attempt', ownerId: 'member-1', expectedAttemptId: attempt.id, attempt,
    target: { type: attempt.bundleId ? 'bundle' : 'course', id: attempt.bundleId ?? 'course-1', title: 'ชื่อปัจจุบัน', href: '/courses/thai' },
    access: { enrolledCount, totalCount: attempt.bundleId ? 2 : 1 },
  }, { now: new Date() }) };
}

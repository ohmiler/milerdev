import 'server-only';

import { and, desc, eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import { bundleCourses, bundles, courses, enrollments, payments } from '@/lib/db/schema';
import { derivePaymentPresentation, type PaymentPresentation } from '@/lib/commerce/payment-presentation';
import { assertPromptPayIntentClaim } from '@/lib/commerce/promptpay-intent';

export type PaymentRecord = { id: string; presentation: PaymentPresentation; canSubmitSlip: boolean };
const contact = { kind: 'contact', label: 'ติดต่อพร้อมเลขอ้างอิง', href: 'mailto:milerdev.official@gmail.com' } as const;

/** Owner-scoped facts and recovery policy shared by history, returns and slip resumption. */
export async function loadPaymentRecords(userId: string): Promise<PaymentRecord[]> {
  const rows = await db.select({
    id: payments.id, userId: payments.userId, courseId: payments.courseId, bundleId: payments.bundleId,
    itemTitle: payments.itemTitle, amount: payments.amount, currency: payments.currency,
    method: payments.method, status: payments.status, createdAt: payments.createdAt,
    courseSlug: courses.slug, bundleSlug: bundles.slug,
  }).from(payments)
    .leftJoin(courses, eq(payments.courseId, courses.id))
    .leftJoin(bundles, eq(payments.bundleId, bundles.id))
    .where(eq(payments.userId, userId)).orderBy(desc(payments.createdAt), desc(payments.id));
  if (!rows.length) return [];
  const bundleIds = [...new Set(rows.flatMap((row) => row.bundleId ? [row.bundleId] : []))];
  const [owned, included] = await Promise.all([
    db.select({ courseId: enrollments.courseId, revokedAt: enrollments.revokedAt }).from(enrollments).where(eq(enrollments.userId, userId)),
    bundleIds.length ? db.select({ bundleId: bundleCourses.bundleId, courseId: bundleCourses.courseId })
      .from(bundleCourses).where(inArray(bundleCourses.bundleId, bundleIds)) : Promise.resolve([]),
  ]);
  const ownedIds = new Set(owned.flatMap((row) => (row.revokedAt ? [] : [row.courseId])));
  const revokedIds = new Set(owned.flatMap((row) => (row.revokedAt ? [row.courseId] : [])));
  const now = new Date();
  return rows.map((attempt, index) => {
    const type = attempt.bundleId ? 'bundle' : 'course';
    const id = attempt.bundleId ?? attempt.courseId ?? '';
    const slug = type === 'bundle' ? attempt.bundleSlug : attempt.courseSlug;
    const courseIds = type === 'course' ? (attempt.courseId ? [attempt.courseId] : [])
      : [...new Set(included.filter((row) => row.bundleId === id).map((row) => row.courseId))];
    const presentation = derivePaymentPresentation({
      kind: 'exact-attempt', ownerId: userId, expectedAttemptId: attempt.id, attempt,
      target: { type, id, title: '', href: slug ? `/${type === 'course' ? 'courses' : 'bundles'}/${slug}` : '/dashboard/payments' },
      // An empty/deleted bundle never implies access readiness.
      access: { enrolledCount: courseIds.filter((courseId) => ownedIds.has(courseId)).length, totalCount: Math.max(1, courseIds.length) },
    }, { now });
    const conflictingAttempt = rows.some((other, otherIndex) => other.id !== attempt.id
      && other.courseId === attempt.courseId && other.bundleId === attempt.bundleId
      && (other.status === 'completed' || other.status === 'verifying' || (other.status === 'pending' && otherIndex < index)));
    let canSubmitSlip = false;
    if (presentation.attempt && courseIds.length && presentation.access.state !== 'ready' && !conflictingAttempt) {
      try {
        canSubmitSlip = assertPromptPayIntentClaim(attempt, { userId, targetType: type, now }).status === 'claimable';
      } catch { /* Only a currently eligible, owner-checked PromptPay attempt may resume. */ }
    }
    if (presentation.recovery.kind === 'restart'
      && (attempt.status !== 'failed' || presentation.access.state !== 'none' || conflictingAttempt || !slug)) {
      presentation.recovery = contact;
      presentation.payment.preventDuplicatePayment = true;
    }
    // An admin withdrew access this payment gave. It does not come back by itself, so say so
    // instead of "กำลังเปิดสิทธิ์", and send the learner to support rather than to pay again.
    if (attempt.status === 'completed' && courseIds.some((courseId) => revokedIds.has(courseId))) {
      presentation.payment = {
        ...presentation.payment,
        label: 'ชำระแล้ว · สิทธิ์ถูกระงับ',
        heading: 'ชำระแล้ว แต่สิทธิ์เรียนถูกระงับ',
        description: 'ผู้ดูแลระงับสิทธิ์เรียนจากรายการนี้ กรุณาติดต่อเราพร้อมเลขอ้างอิง อย่าชำระซ้ำ',
      };
      presentation.recovery = contact;
    }
    if (canSubmitSlip) {
      presentation.recovery = { kind: 'resume', label: 'แนบสลิปในรายการเดิม', href: `/dashboard/payments/${encodeURIComponent(attempt.id)}` };
    }
    return { id: attempt.id, presentation, canSubmitSlip };
  });
}

export async function loadPaymentRecord(userId: string, paymentId: string) {
  if (!/^[a-zA-Z0-9_-]{1,36}$/.test(paymentId)) return null;
  const owned = await db.query.payments.findFirst({
    where: and(eq(payments.id, paymentId), eq(payments.userId, userId)), columns: { id: true },
  });
  if (!owned) return null;
  return (await loadPaymentRecords(userId)).find((record) => record.id === paymentId) ?? null;
}

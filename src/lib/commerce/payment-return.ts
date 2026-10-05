import 'server-only';

import { and, asc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { bundleCourses, bundles, courses } from '@/lib/db/schema';
import { stripe } from '@/lib/commerce/stripe';
import { fulfillStripeCheckoutSession } from '@/lib/commerce/payment-fulfillment';
import { loadPaymentRecord } from '@/lib/commerce/payment-records';
import { derivePaymentPresentation, type PaymentTarget } from '@/lib/commerce/payment-presentation';

export type LearningStart = { href: string; label: string };

// Where a buyer starts once access is ready. The learn route opens the first unfinished lesson,
// which is the first lesson for a new purchase. A Bundle starts with its first published course.
export async function loadLearningStart(target: Pick<PaymentTarget, 'type' | 'id' | 'href'>): Promise<LearningStart | null> {
  if (target.type === 'course') return target.href.startsWith('/courses/') ? { href: `${target.href}/learn`, label: 'เริ่มเรียนบทแรก' } : null;
  const [first] = await db.select({ slug: courses.slug }).from(bundleCourses)
    .innerJoin(courses, eq(bundleCourses.courseId, courses.id))
    .where(and(eq(bundleCourses.bundleId, target.id), eq(courses.status, 'published')))
    .orderBy(asc(bundleCourses.orderIndex))
    .limit(1);
  return first ? { href: `/courses/${first.slug}/learn`, label: 'เริ่มเรียนคอร์สแรก' } : null;
}

export function isStripeReturnId(value: unknown): value is string {
  return typeof value === 'string' && /^cs_[a-zA-Z0-9_-]{1,240}$/.test(value);
}

export async function loadPaymentReturn(userId: string, type: 'course' | 'bundle', slug: string, sessionId?: string) {
  const product = type === 'course'
    ? await db.query.courses.findFirst({ where: eq(courses.slug, slug), columns: { id: true, title: true, slug: true } })
    : await db.query.bundles.findFirst({ where: eq(bundles.slug, slug), columns: { id: true, title: true, slug: true } });
  if (!product) return null;
  const target = { type, id: product.id, title: product.title, href: `/${type === 'course' ? 'courses' : 'bundles'}/${product.slug}` };
  const unconfirmed = { id: '', canSubmitSlip: false, presentation: derivePaymentPresentation({
    kind: 'exact-attempt', ownerId: userId, expectedAttemptId: '', target, attempt: null,
    access: { enrolledCount: 0, totalCount: 1 },
  }, { now: new Date() }) };
  if (!isStripeReturnId(sessionId)) return unconfirmed;
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const metadata = session.metadata;
    if (metadata?.userId !== userId || metadata.type !== type
      || (type === 'course' ? metadata.courseId : metadata.bundleId) !== product.id || !metadata.paymentId) return unconfirmed;
    const before = await loadPaymentRecord(userId, metadata.paymentId);
    if (!before || before.presentation.target.id !== product.id || before.presentation.target.type !== type
      || before.presentation.attempt?.method !== 'stripe') return unconfirmed;
    if (before.presentation.attempt.rawStatus === 'refunded' || before.presentation.attempt.rawStatus === 'failed') return before;
    if (session.payment_status === 'paid') {
      // Replays use the existing strict authority, including repairing missing access.
      const result = await fulfillStripeCheckoutSession({ session, expected: { userId, type, itemId: product.id } });
      if (result.status === 'rejected') return unconfirmed;
    }
    return await loadPaymentRecord(userId, metadata.paymentId) ?? unconfirmed;
  } catch {
    // Provider errors can contain sensitive request details. Never expose or log them here.
    return unconfirmed;
  }
}

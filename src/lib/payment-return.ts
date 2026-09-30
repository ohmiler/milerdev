import 'server-only';

import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { bundles, courses } from '@/lib/db/schema';
import { stripe } from '@/lib/stripe';
import { fulfillStripeCheckoutSession } from '@/lib/payment-fulfillment';
import { loadPaymentRecord } from '@/lib/payment-records';
import { derivePaymentPresentation } from '@/lib/payment-presentation';

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

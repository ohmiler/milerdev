import 'server-only';

import { and, eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import { bundleCourses, bundles, courses, enrollments, payments } from '@/lib/db/schema';
import { derivePaymentPresentation } from '@/lib/payment-presentation';
import { assertPromptPayIntentClaim } from '@/lib/promptpay-intent';

export async function loadPromptPayPresentation(userId: string, paymentId: string) {
  const attempt = await db.query.payments.findFirst({
    where: and(eq(payments.id, paymentId), eq(payments.userId, userId), eq(payments.method, 'promptpay')),
  });
  if (!attempt || Boolean(attempt.courseId) === Boolean(attempt.bundleId)) return null;
  const type = attempt.courseId ? 'course' : 'bundle';
  const product = type === 'course'
    ? await db.query.courses.findFirst({ where: eq(courses.id, attempt.courseId!), columns: { id: true, title: true, slug: true } })
    : await db.query.bundles.findFirst({ where: eq(bundles.id, attempt.bundleId!), columns: { id: true, title: true, slug: true } });
  if (!product) return null;
  const ids = type === 'course' ? [product.id] : (await db.select({ courseId: bundleCourses.courseId }).from(bundleCourses).where(eq(bundleCourses.bundleId, product.id))).map((row) => row.courseId);
  if (!ids.length) return null;
  const owned = await db.select({ courseId: enrollments.courseId }).from(enrollments)
    .where(and(eq(enrollments.userId, userId), inArray(enrollments.courseId, ids)));
  const now = new Date();
  const presentation = derivePaymentPresentation({
    kind: 'exact-attempt', ownerId: userId, expectedAttemptId: paymentId,
    target: { type, id: product.id, title: product.title, href: `/${type === 'course' ? 'courses' : 'bundles'}/${product.slug}` },
    attempt, access: { enrolledCount: new Set(owned.map((row) => row.courseId)).size, totalCount: ids.length },
  }, { now });
  let canSubmitSlip = false;
  try {
    canSubmitSlip = assertPromptPayIntentClaim(attempt, { userId, targetType: type, now }).status === 'claimable';
  } catch { /* Only the owner-checked claim contract permits a retry. */ }
  return { presentation, canSubmitSlip };
}

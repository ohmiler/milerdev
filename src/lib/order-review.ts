import 'server-only';

import { and, count, eq, inArray } from 'drizzle-orm';
import { deriveBundleDecisionFacts } from '@/lib/bundle-decision-facts';
import { resolveCourseAcquisition } from '@/lib/course-acquisition';
import { db } from '@/lib/db';
import { bundleCourses, bundles, courses, enrollments, lessons } from '@/lib/db/schema';

export type OrderReview = {
  target: { type: 'course' | 'bundle'; id: string; title: string; href: string };
  price: { original: string; discount: string; amountDue: string; currency: 'THB' };
  coupon: { id: string; code: string; description: string | null } | null;
  access: { ownedCount: number; totalCount: number; description: string };
  comparison: { separate: string; label: string } | null;
  action: 'pay' | 'enroll-free' | 'owned' | 'unavailable';
};

export class OrderReviewError extends Error {
  constructor(message: string, readonly status: number = 400) { super(message); }
}

export async function loadOrderReview(
  userId: string,
  input: { courseId?: string; bundleId?: string; couponCode?: string },
): Promise<OrderReview> {
  const now = new Date();
  if (input.courseId) {
    const decision = await resolveCourseAcquisition({
      kind: 'review', userId, courseId: input.courseId, couponCode: input.couponCode,
    });
    if (decision.kind !== 'ready') {
      if (decision.kind === 'revoked') throw new OrderReviewError('สิทธิ์เรียนถูกถอน กรุณาติดต่อผู้ดูแลระบบ', 403);
      if (decision.kind === 'not_found') throw new OrderReviewError('ไม่พบคอร์สที่เปิดขาย', 404);
      if (decision.kind === 'coupon_not_found') throw new OrderReviewError('ไม่พบคูปองนี้');
      if (decision.kind === 'invalid_coupon') throw new OrderReviewError(decision.message);
      throw new OrderReviewError('คอร์สนี้ยังไม่พร้อมรับการลงทะเบียน', 409);
    }
    const { course, coupon, action } = decision;
    if (action === 'verify-payment') throw new Error('Order review cannot verify a payment');
    return {
      target: { type: 'course', id: course.id, title: course.title, href: `/courses/${course.slug}` },
      price: decision.price,
      coupon: coupon ? { id: coupon.id, code: coupon.code, description: coupon.description } : null,
      access: { ownedCount: action === 'owned' ? 1 : 0, totalCount: 1, description: action === 'owned' ? 'คุณมีสิทธิ์เรียนคอร์สนี้แล้ว' : 'ได้รับสิทธิ์เรียนคอร์สนี้เมื่อระบบยืนยันการชำระเงิน หรือยืนยันการลงทะเบียนเรียนฟรีแล้ว' },
      comparison: null,
      action,
    };
  }

  const bundle = await db.query.bundles.findFirst({
    where: and(eq(bundles.id, input.bundleId!), eq(bundles.status, 'published')),
  });
  if (!bundle) throw new OrderReviewError('ไม่พบ Bundle ที่เปิดขาย', 404);
  const included = await db.select({ course: courses, orderIndex: bundleCourses.orderIndex }).from(bundleCourses)
    .innerJoin(courses, eq(bundleCourses.courseId, courses.id)).where(eq(bundleCourses.bundleId, bundle.id));
  if (included.some(({ course }) => course.status !== 'published')) {
    throw new OrderReviewError('Bundle นี้ยังไม่พร้อมรับการลงทะเบียน', 409);
  }
  const ids = included.map(({ course }) => course.id);
  const [lessonCounts, owned] = ids.length ? await Promise.all([
    db.select({ courseId: lessons.courseId, count: count() }).from(lessons).where(inArray(lessons.courseId, ids)).groupBy(lessons.courseId),
    db.select({ courseId: enrollments.courseId, revokedAt: enrollments.revokedAt }).from(enrollments).where(and(eq(enrollments.userId, userId), inArray(enrollments.courseId, ids))),
  ]) : [[], []];
  if (owned.some((row) => row.revokedAt)) throw new OrderReviewError('สิทธิ์เรียนถูกถอน กรุณาติดต่อผู้ดูแลระบบ', 403);
  const counts = new Map(lessonCounts.map((row) => [row.courseId, row.count]));
  const ownedIds = new Set(owned.map((row) => row.courseId));
  const facts = deriveBundleDecisionFacts({ slug: bundle.slug, price: bundle.price, courses: included.map(({ course, orderIndex }) => ({
    id: course.id, title: course.title, slug: course.slug, orderIndex, regularPrice: course.price,
    promotion: course.promoPrice === null ? null : { price: course.promoPrice, startsAt: course.promoStartsAt, endsAt: course.promoEndsAt },
    lessonCount: counts.get(course.id) ?? 0, owned: ownedIds.has(course.id),
  })) }, { now });
  return {
    target: { type: 'bundle', id: bundle.id, title: bundle.title, href: facts.actions.discovery.href },
    price: { original: facts.price.bundle.toFixed(2), discount: '0.00', amountDue: facts.price.bundle.toFixed(2), currency: 'THB' },
    coupon: null,
    access: { ownedCount: facts.ownership.ownedCount, totalCount: ids.length, description: facts.ownership.disclosure || (facts.ownership.status === 'complete' ? 'คุณมีสิทธิ์เรียนทุกคอร์สใน Bundle นี้แล้ว' : 'ได้รับสิทธิ์เรียนทุกคอร์สใน Bundle เมื่อระบบยืนยันการชำระเงิน หรือยืนยันการลงทะเบียนเรียนฟรีแล้ว') },
    comparison: { separate: facts.price.separateCurrent.toFixed(2), label: facts.price.comparison.label },
    action: facts.ownership.status === 'complete' ? 'owned' : facts.readiness !== 'ready' ? 'unavailable' : facts.price.isFree ? 'enroll-free' : 'pay',
  };
}

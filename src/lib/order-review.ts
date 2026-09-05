import 'server-only';

import { and, count, eq, inArray } from 'drizzle-orm';
import { deriveBundleDecisionFacts } from '@/lib/bundle-decision-facts';
import { deriveCourseDecisionFacts } from '@/lib/course-decision-facts';
import { calculateDiscount, validateCouponEligibility } from '@/lib/coupon';
import { db } from '@/lib/db';
import { bundleCourses, bundles, coupons, couponUsages, courses, enrollments, lessons } from '@/lib/db/schema';

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
    const course = await db.query.courses.findFirst({
      where: and(eq(courses.id, input.courseId), eq(courses.status, 'published')),
      with: { lessons: { columns: { id: true } } },
    });
    if (!course) throw new OrderReviewError('ไม่พบคอร์สที่เปิดขาย', 404);
    const owned = await db.query.enrollments.findFirst({
      where: and(eq(enrollments.userId, userId), eq(enrollments.courseId, course.id)),
      columns: { id: true },
    });
    const facts = deriveCourseDecisionFacts({
      slug: course.slug, regularPrice: course.price, lessonCount: course.lessons.length,
      promotion: course.promoPrice === null ? null : {
        price: course.promoPrice, startsAt: course.promoStartsAt, endsAt: course.promoEndsAt,
      },
    }, { now });
    let coupon: OrderReview['coupon'] = null;
    let amount = facts.price.effective;
    if (input.couponCode) {
      const record = await db.query.coupons.findFirst({ where: eq(coupons.code, input.couponCode.toUpperCase()) });
      if (!record) throw new OrderReviewError('ไม่พบคูปองนี้');
      const [usage] = await db.select({ count: count() }).from(couponUsages)
        .where(and(eq(couponUsages.couponId, record.id), eq(couponUsages.userId, userId)));
      const eligibility = validateCouponEligibility(record, {
        targetCourseId: course.id, userUsageCount: usage?.count ?? 0, coursePrice: amount,
      });
      if (!eligibility.valid) throw new OrderReviewError(eligibility.error || 'คูปองนี้ใช้ไม่ได้');
      amount = Math.max(0, amount - calculateDiscount(amount, record.discountType, record.discountValue, record.maxDiscount));
      amount = Math.round(amount * 100) / 100;
      coupon = { id: record.id, code: record.code, description: record.description };
    }
    return {
      target: { type: 'course', id: course.id, title: course.title, href: facts.actions.discovery.href },
      price: { original: facts.price.effective.toFixed(2), discount: (facts.price.effective - amount).toFixed(2), amountDue: amount.toFixed(2), currency: 'THB' },
      coupon,
      access: { ownedCount: owned ? 1 : 0, totalCount: 1, description: owned ? 'คุณมีสิทธิ์เรียนคอร์สนี้แล้ว' : 'ได้รับสิทธิ์เรียนคอร์สนี้เมื่อระบบยืนยันการชำระเงิน หรือยืนยันการลงทะเบียนเรียนฟรีแล้ว' },
      comparison: null,
      action: owned ? 'owned' : facts.readiness !== 'ready' ? 'unavailable' : amount === 0 ? 'enroll-free' : 'pay',
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
    db.select({ courseId: enrollments.courseId }).from(enrollments).where(and(eq(enrollments.userId, userId), inArray(enrollments.courseId, ids))),
  ]) : [[], []];
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

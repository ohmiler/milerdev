import 'server-only';

import { and, count, eq, inArray } from 'drizzle-orm';
import { deriveBundleDecisionFacts } from '@/lib/commerce/bundle-decision-facts';
import { deriveCourseDecisionFacts } from '@/lib/commerce/course-decision-facts';
import { db } from '@/lib/db';
import { bundleCourses, bundles, courses, enrollments, lessons } from '@/lib/db/schema';

export type OrderReview = {
  target: { type: 'course' | 'bundle'; id: string; title: string; href: string };
  price: { amountDue: string; currency: 'THB' };
  access: { ownedCount: number; totalCount: number; description: string };
  comparison: { separate: string; label: string } | null;
  action: 'pay' | 'enroll-free' | 'owned' | 'unavailable';
};

export class OrderReviewError extends Error {
  constructor(message: string, readonly status: number = 400) { super(message); }
}

export async function loadOrderReview(
  userId: string,
  input: { courseId?: string; bundleId?: string },
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
    const amount = facts.price.effective;
    return {
      target: { type: 'course', id: course.id, title: course.title, href: facts.actions.discovery.href },
      price: { amountDue: amount.toFixed(2), currency: 'THB' },
      access: { ownedCount: owned ? 1 : 0, totalCount: 1, description: owned ? 'คุณมีสิทธิ์เรียนคอร์สนี้แล้ว' : amount === 0 ? 'เรียนได้ทันทีหลังกดยืนยันลงทะเบียน' : 'เรียนได้ทันทีหลังระบบยืนยันการชำระเงิน' },
      comparison: null,
      action: owned ? 'owned' : facts.readiness !== 'ready' ? 'unavailable' : amount === 0 ? 'enroll-free' : 'pay',
    };
  }

  const bundle = await db.query.bundles.findFirst({
    where: and(eq(bundles.id, input.bundleId!), eq(bundles.status, 'published')),
  });
  if (!bundle) throw new OrderReviewError('ไม่พบชุดคอร์สที่เปิดขาย', 404);
  const included = await db.select({ course: courses, orderIndex: bundleCourses.orderIndex }).from(bundleCourses)
    .innerJoin(courses, eq(bundleCourses.courseId, courses.id)).where(eq(bundleCourses.bundleId, bundle.id));
  if (included.some(({ course }) => course.status !== 'published')) {
    throw new OrderReviewError('ชุดคอร์สนี้ยังไม่พร้อมรับการลงทะเบียน', 409);
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
    price: { amountDue: facts.price.bundle.toFixed(2), currency: 'THB' },
    access: { ownedCount: facts.ownership.ownedCount, totalCount: ids.length, description: facts.ownership.disclosure || (facts.ownership.status === 'complete' ? 'คุณมีสิทธิ์เรียนทุกคอร์สในชุดนี้แล้ว' : facts.price.isFree ? 'เรียนได้ทุกคอร์สในชุดทันทีหลังกดยืนยันลงทะเบียน' : 'เรียนได้ทุกคอร์สในชุดทันทีหลังระบบยืนยันการชำระเงิน') },
    comparison: { separate: facts.price.separateCurrent.toFixed(2), label: facts.price.comparison.label },
    action: facts.ownership.status === 'complete' ? 'owned' : facts.readiness !== 'ready' ? 'unavailable' : facts.price.isFree ? 'enroll-free' : 'pay',
  };
}

import 'server-only';

import { and, count, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { coupons, couponUsages, courses, enrollments } from '@/lib/db/schema';
import { deriveCourseDecisionFacts } from '@/lib/course-decision-facts';
import { calculateDiscount, validateCouponEligibility } from '@/lib/coupon';

type Course = Pick<typeof courses.$inferSelect,
  'id' | 'title' | 'slug' | 'description' | 'thumbnailUrl' | 'status' |
  'price' | 'promoPrice' | 'promoStartsAt' | 'promoEndsAt'
> & { lessons: { id: string }[] };
type Coupon = typeof coupons.$inferSelect;
type CouponSelection = { id: string } | { code: string };

type AcquisitionInput = { userId: string; courseId: string } & (
  | { kind: 'review'; couponCode?: string }
  | { kind: 'checkout'; couponId?: string }
  | { kind: 'enroll'; couponId?: string; paymentId?: string }
);

export type CourseAcquisitionStore = {
  readCourse(courseId: string): Promise<Course | null>;
  hasEnrollment(userId: string, courseId: string): Promise<boolean | 'revoked'>;
  readCoupon(selection: CouponSelection): Promise<Coupon | null>;
  readCouponUsage(userId: string, couponId: string): Promise<number>;
};

type AcquisitionDecision =
  | { kind: 'not_found' }
  | { kind: 'owned' }
  | { kind: 'revoked' }
  | { kind: 'not_ready' }
  | { kind: 'coupon_not_found' }
  | { kind: 'invalid_coupon'; message: string }
  | {
    kind: 'ready';
    course: Course;
    action: 'pay' | 'enroll-free' | 'owned' | 'unavailable' | 'verify-payment';
    price: { original: string; discount: string; amountDue: string; currency: 'THB' };
    coupon: { id: string; code: string; description: string | null; discountAmount: string } | null;
  };

const databaseStore: CourseAcquisitionStore = {
  async readCourse(courseId) {
    return await db.query.courses.findFirst({
      where: eq(courses.id, courseId),
      with: { lessons: { columns: { id: true } } },
    }) ?? null;
  },
  async hasEnrollment(userId, courseId) {
    const enrollment = await db.query.enrollments.findFirst({
      where: and(eq(enrollments.userId, userId), eq(enrollments.courseId, courseId)),
    });
    return enrollment?.revokedAt ? 'revoked' : Boolean(enrollment);
  },
  async readCoupon(selection) {
    if ('code' in selection) {
      return await db.query.coupons.findFirst({ where: eq(coupons.code, selection.code) }) ?? null;
    }
    const [coupon] = await db.select().from(coupons).where(eq(coupons.id, selection.id)).limit(1);
    return coupon ?? null;
  },
  async readCouponUsage(userId, couponId) {
    const [usage] = await db.select({ count: count() }).from(couponUsages)
      .where(and(eq(couponUsages.couponId, couponId), eq(couponUsages.userId, userId)));
    return usage?.count ?? 0;
  },
};

// Read fresh facts for each review/initiation. This decision never grants access,
// reserves coupon usage, creates a payment, or replaces transactional fulfillment.
export async function resolveCourseAcquisition(
  input: AcquisitionInput,
  store: CourseAcquisitionStore = databaseStore,
): Promise<AcquisitionDecision> {
  const course = await store.readCourse(input.courseId);
  if (!course || course.status !== 'published') return { kind: 'not_found' };
  const owned = await store.hasEnrollment(input.userId, course.id);
  if (owned === 'revoked') return { kind: 'revoked' };
  if (owned && input.kind !== 'review') return { kind: 'owned' };

  const facts = deriveCourseDecisionFacts({
    slug: course.slug, regularPrice: course.price, lessonCount: course.lessons.length,
    promotion: course.promoPrice == null ? null : {
      price: course.promoPrice, startsAt: course.promoStartsAt, endsAt: course.promoEndsAt,
    },
  }, { now: new Date() });
  const original = facts.price.effective;
  const verifyPayment = input.kind === 'enroll' && original > 0 && Boolean(input.paymentId);
  // Already-paid recovery must still verify ownership/status in the caller, but
  // is not subject to readiness or coupon eligibility for a new acquisition.
  if (input.kind !== 'review' && !verifyPayment && facts.readiness !== 'ready') {
    return { kind: 'not_ready' };
  }

  let coupon: Extract<AcquisitionDecision, { kind: 'ready' }>['coupon'] = null;
  let remaining = original;
  const selection: CouponSelection | null = input.kind === 'review'
    ? input.couponCode ? { code: input.couponCode.toUpperCase() } : null
    : input.couponId ? { id: input.couponId } : null;
  // Free enrollment historically ignores coupons on an already-free course.
  if (selection && !verifyPayment && !(input.kind === 'enroll' && original === 0)) {
    const record = await store.readCoupon(selection);
    if (!record) return { kind: 'coupon_not_found' };
    const eligibility = validateCouponEligibility(record, {
      targetCourseId: course.id,
      userUsageCount: await store.readCouponUsage(input.userId, record.id),
      coursePrice: original,
    });
    if (!eligibility.valid) return { kind: 'invalid_coupon', message: eligibility.error || 'คูปองนี้ใช้ไม่ได้' };
    const discount = calculateDiscount(original, record.discountType, record.discountValue, record.maxDiscount);
    remaining = Math.max(0, original - discount);
    coupon = {
      id: record.id, code: record.code, description: record.description,
      discountAmount: String(Math.min(discount, original)),
    };
  }

  const amount = Math.round(remaining * 100) / 100;
  // Preserve the free-enrollment requirement for a full discount before rounding.
  const free = input.kind === 'enroll' ? remaining === 0 : amount === 0;
  const action = verifyPayment ? 'verify-payment'
    : owned ? 'owned'
      : facts.readiness !== 'ready' ? 'unavailable'
        : free ? 'enroll-free' : 'pay';
  return {
    kind: 'ready', course, action, coupon,
    price: {
      original: original.toFixed(2), discount: (original - amount).toFixed(2),
      amountDue: amount.toFixed(2), currency: 'THB',
    },
  };
}

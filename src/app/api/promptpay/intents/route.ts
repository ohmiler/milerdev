import { and, asc, count, eq, inArray } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { auth } from '@/lib/auth';
import { requirePublishedBundleCourses, requireReadyBundleCourses } from '@/lib/bundle-commerce';
import { COURSE_NOT_READY, requireCourseHasLessons } from '@/lib/course-availability';
import { calculateDiscount, validateCouponEligibility } from '@/lib/coupon';
import { db } from '@/lib/db';
import {
  bundleCourses,
  bundles,
  coupons,
  couponUsages,
  courses,
  enrollments,
  lessons,
  payments,
} from '@/lib/db/schema';
import { loadPromptPayPresentation } from '@/lib/promptpay-presentation';
import { PROMPTPAY_INTENT_TTL_MS } from '@/lib/promptpay-intent';
import { checkRateLimit, rateLimits, rateLimitResponse } from '@/lib/rate-limit';

const intentSchema = z.object({
  courseId: z.string().min(1).max(36).optional(),
  bundleId: z.string().min(1).max(36).optional(),
  couponId: z.string().min(1).max(36).optional(),
  expectedAmount: z.string().regex(/^\d{1,8}\.\d{2}$/).optional(),
}).strict().superRefine((value, context) => {
  if (Boolean(value.courseId) === Boolean(value.bundleId)) {
    context.addIssue({ code: 'custom', message: 'Exactly one payment target is required' });
  }
  if (value.bundleId && value.couponId) {
    context.addIssue({ code: 'custom', path: ['couponId'], message: 'Bundle coupons are unsupported' });
  }
});

function unavailable(code: string, status: 400 | 404 | 409 = 409): never {
  throw Object.assign(new Error(code), { status });
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const rateLimit = checkRateLimit(`promptpay-intent:${session.user.id}`, rateLimits.sensitive);
    if (!rateLimit.success) return rateLimitResponse(rateLimit.resetTime);

    const parsed = intentSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payment target' }, { status: 400 });
    }

    const now = new Date();
    const paymentId = crypto.randomUUID();
    const result = await db.transaction(async (tx) => {
      if (parsed.data.courseId) {
        const [course] = await tx.select().from(courses)
          .where(eq(courses.id, parsed.data.courseId))
          .for('update');
        if (!course || course.status !== 'published') unavailable('COURSE_NOT_AVAILABLE', 404);

        const [lessonResult] = await tx.select({ lessonCount: count(lessons.id) })
          .from(lessons)
          .where(eq(lessons.courseId, course.id));
        try {
          requireCourseHasLessons(lessonResult?.lessonCount ?? 0);
        } catch {
          unavailable(COURSE_NOT_READY);
        }

        const [existingEnrollment] = await tx.select({ id: enrollments.id })
          .from(enrollments)
          .where(and(
            eq(enrollments.userId, session.user.id),
            eq(enrollments.courseId, course.id),
          ))
          .limit(1);
        if (existingEnrollment) unavailable('ALREADY_ENROLLED', 400);

        const originalPrice = Number(course.price);
        const promoActive = course.promoPrice !== null
          && (!course.promoStartsAt || course.promoStartsAt <= now)
          && (!course.promoEndsAt || course.promoEndsAt >= now);
        let amount = promoActive ? Number(course.promoPrice) : originalPrice;
        let couponId: string | null = null;

        if (parsed.data.couponId) {
          const [coupon] = await tx.select().from(coupons)
            .where(eq(coupons.id, parsed.data.couponId))
            .for('update');
          if (!coupon) unavailable('COUPON_NOT_AVAILABLE', 400);
          const [usage] = await tx.select({ count: count() }).from(couponUsages)
            .where(and(
              eq(couponUsages.couponId, coupon.id),
              eq(couponUsages.userId, session.user.id),
            ));
          const eligibility = validateCouponEligibility(coupon, {
            targetCourseId: course.id,
            userUsageCount: usage?.count ?? 0,
            coursePrice: amount,
          });
          if (!eligibility.valid) unavailable('COUPON_NOT_AVAILABLE', 400);
          amount = Math.max(0, amount - calculateDiscount(
            amount,
            coupon.discountType,
            coupon.discountValue,
            coupon.maxDiscount,
          ));
          couponId = coupon.id;
        }

        amount = Math.round(amount * 100) / 100;
        if (!Number.isFinite(amount) || amount <= 0) unavailable('PAYMENT_AMOUNT_INVALID', 400);
        if (parsed.data.expectedAmount !== undefined && parsed.data.expectedAmount !== amount.toFixed(2)) {
          unavailable('ราคาเปลี่ยนแปลง กรุณาตรวจสอบรายการและยืนยันยอดใหม่');
        }
        await tx.insert(payments).values({
          id: paymentId,
          userId: session.user.id,
          courseId: course.id,
          couponId,
          amount: amount.toFixed(2),
          currency: 'THB',
          method: 'promptpay',
          itemTitle: course.title,
          status: 'pending',
          createdAt: now,
        });
        return { amount, itemTitle: course.title };
      }

      const bundleId = parsed.data.bundleId!;
      const includedCourses = await tx.select({
        id: courses.id,
        status: courses.status,
      }).from(bundleCourses)
        .innerJoin(courses, eq(bundleCourses.courseId, courses.id))
        .where(eq(bundleCourses.bundleId, bundleId))
        .orderBy(asc(courses.id))
        .for('update');
      try {
        requirePublishedBundleCourses(includedCourses);
      } catch {
        unavailable('BUNDLE_NOT_AVAILABLE');
      }

      const lessonCountRows = await tx.select({
        courseId: lessons.courseId,
        lessonCount: count(lessons.id),
      }).from(lessons)
        .where(inArray(lessons.courseId, includedCourses.map((course) => course.id)))
        .groupBy(lessons.courseId);
      const lessonCounts = new Map(lessonCountRows.map((row) => [row.courseId, row.lessonCount]));
      try {
        requireReadyBundleCourses(includedCourses.map((course) => ({
          ...course,
          lessonCount: lessonCounts.get(course.id) ?? 0,
        })));
      } catch {
        unavailable('BUNDLE_NOT_READY');
      }

      const [bundle] = await tx.select().from(bundles)
        .where(eq(bundles.id, bundleId))
        .for('update');
      if (!bundle || bundle.status !== 'published') unavailable('BUNDLE_NOT_AVAILABLE', 404);

      const enrolledRows = await tx.select({ courseId: enrollments.courseId })
        .from(enrollments)
        .where(eq(enrollments.userId, session.user.id));
      const enrolledIds = new Set(enrolledRows.map((row) => row.courseId));
      if (includedCourses.every((course) => enrolledIds.has(course.id))) {
        unavailable('ALREADY_ENROLLED', 400);
      }

      const amount = Number(bundle.price);
      if (!Number.isFinite(amount) || amount <= 0) unavailable('PAYMENT_AMOUNT_INVALID', 400);
      if (parsed.data.expectedAmount !== undefined && parsed.data.expectedAmount !== amount.toFixed(2)) {
        unavailable('ราคาเปลี่ยนแปลง กรุณาตรวจสอบรายการและยืนยันยอดใหม่');
      }
      await tx.insert(payments).values({
        id: paymentId,
        userId: session.user.id,
        bundleId: bundle.id,
        amount: amount.toFixed(2),
        currency: 'THB',
        method: 'promptpay',
        itemTitle: bundle.title,
        status: 'pending',
        createdAt: now,
      });
      return { amount, itemTitle: bundle.title };
    });

    return NextResponse.json({
      paymentId,
      amount: result.amount,
      itemTitle: result.itemTitle,
      expiresAt: new Date(now.getTime() + PROMPTPAY_INTENT_TTL_MS).toISOString(),
    }, { status: 201 });
  } catch (error) {
    const status = typeof error === 'object' && error && 'status' in error
      ? Number(error.status)
      : 500;
    const message = error instanceof Error && status !== 500 ? error.message : 'Failed to create payment intent';
    if (status === 500) console.error('Error creating PromptPay intent:', error);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
  const limit = checkRateLimit(`promptpay-status:${session.user.id}`, rateLimits.sensitive);
  if (!limit.success) return rateLimitResponse(limit.resetTime);
  const parsed = z.string().min(1).max(36).safeParse(new URL(request.url).searchParams.get('paymentId'));
  if (!parsed.success) return NextResponse.json({ error: 'ข้อมูลรายการไม่ถูกต้อง' }, { status: 400 });
  try {
    const result = await loadPromptPayPresentation(session.user.id, parsed.data);
    if (!result) return NextResponse.json({ error: 'ไม่พบรายการ' }, { status: 404 });
    return NextResponse.json(result, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch {
    return NextResponse.json({ error: 'ยังตรวจสอบสถานะไม่ได้' }, { status: 503 });
  }
}

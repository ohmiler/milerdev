import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { enrollments, courses, payments, coupons, couponUsages } from "@/lib/db/schema";
import { eq, and, sql, count } from "drizzle-orm";
import { sendEnrollmentEmail } from "@/lib/email";
import { z } from "zod";
import { createId } from "@paralleldrive/cuid2";
import { checkRateLimit, rateLimits, rateLimitResponse } from "@/lib/rate-limit";
import { calculateDiscount, validateCouponEligibility } from "@/lib/coupon";

// Validation schema
const enrollSchema = z.object({
    courseId: z.string().min(1, "Course ID is required"),
    paymentId: z.string().optional(),
    couponId: z.string().optional(),
});

// POST /api/enroll - Enroll in a course
export async function POST(request: Request) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const rateLimit = checkRateLimit(`enroll:${session.user.id}`, rateLimits.sensitive);
        if (!rateLimit.success) {
            return rateLimitResponse(rateLimit.resetTime);
        }

        const body = await request.json();
        const validation = enrollSchema.safeParse(body);
        
        if (!validation.success) {
            return NextResponse.json(
                { error: validation.error.issues[0].message },
                { status: 400 }
            );
        }
        
        const { courseId, paymentId, couponId } = validation.data;

        // Check if course exists
        const course = await db.query.courses.findFirst({
            where: eq(courses.id, courseId),
        });

        if (!course || course.status !== 'published') {
            return NextResponse.json({ error: "Course not found" }, { status: 404 });
        }

        // Check if already enrolled
        const existingEnrollment = await db.query.enrollments.findFirst({
            where: and(
                eq(enrollments.userId, session.user.id),
                eq(enrollments.courseId, courseId)
            ),
        });

        if (existingEnrollment) {
            return NextResponse.json(
                { error: "Already enrolled in this course" },
                { status: 400 }
            );
        }

        // Calculate effective price (use promo price if active)
        const originalPrice = parseFloat(course.price || '0');
        const now = new Date();
        const hasPromo = course.promoPrice !== null && course.promoPrice !== undefined;
        const promoStartOk = !course.promoStartsAt || new Date(course.promoStartsAt) <= now;
        const promoEndOk = !course.promoEndsAt || new Date(course.promoEndsAt) >= now;
        const isPromoActive = hasPromo && promoStartOk && promoEndOk;
        const coursePrice = isPromoActive ? parseFloat(course.promoPrice!.toString()) : originalPrice;

        // If course is paid, verify payment
        if (coursePrice > 0 && paymentId) {
            const payment = await db.query.payments.findFirst({
                where: and(
                    eq(payments.id, paymentId),
                    eq(payments.userId, session.user.id),
                    eq(payments.courseId, courseId),
                    eq(payments.status, "completed")
                ),
            });

            if (!payment) {
                return NextResponse.json(
                    { error: "Valid payment required" },
                    { status: 402 }
                );
            }
        } else if (coursePrice > 0 && couponId) {
            // Coupon-based free enrollment — validate coupon makes it free
            const [coupon] = await db.select().from(coupons).where(eq(coupons.id, couponId)).limit(1);
            if (!coupon) {
                return NextResponse.json({ error: 'คูปองไม่ถูกต้อง' }, { status: 400 });
            }

            const [userUsage] = await db.select({ count: count() }).from(couponUsages)
                .where(and(eq(couponUsages.couponId, coupon.id), eq(couponUsages.userId, session.user.id)));

            const eligibility = validateCouponEligibility(coupon, {
                targetCourseId: courseId,
                userUsageCount: userUsage?.count || 0,
                coursePrice,
            });
            if (!eligibility.valid) {
                return NextResponse.json({ error: eligibility.error }, { status: 400 });
            }

            const discount = calculateDiscount(
                coursePrice,
                coupon.discountType as 'percentage' | 'fixed',
                coupon.discountValue,
                coupon.maxDiscount,
            );
            if (discount < coursePrice) {
                return NextResponse.json({ error: 'คูปองนี้ไม่ได้ลด 100% กรุณาชำระเงินส่วนที่เหลือ' }, { status: 402 });
            }
            // Record coupon usage + enrollment in a transaction to prevent race conditions
            const enrollmentId = createId();
            await db.transaction(async (tx) => {
                await tx.insert(couponUsages).values({
                    couponId: coupon.id,
                    userId: session.user.id,
                    courseId,
                    discountAmount: String(Math.min(discount, coursePrice)),
                });
                await tx.update(coupons).set({ usageCount: sql`${coupons.usageCount} + 1` }).where(eq(coupons.id, coupon.id));
                await tx.insert(enrollments).values({
                    id: enrollmentId,
                    userId: session.user.id,
                    courseId,
                });
            });

            const enrollment = { id: enrollmentId, userId: session.user.id, courseId };

            // Send enrollment email (non-blocking)
            if (session.user.email && session.user.name) {
                sendEnrollmentEmail({
                    email: session.user.email,
                    name: session.user.name,
                    courseName: course.title,
                    courseSlug: course.slug,
                }).catch((err) => console.error("Failed to send enrollment email:", err));
            }

            return NextResponse.json(enrollment, { status: 201 });
        } else if (coursePrice > 0) {
            return NextResponse.json(
                { error: "Payment required for this course" },
                { status: 402 }
            );
        }

        // Create enrollment (free course or paid with payment verification)
        const enrollmentId = createId();
        await db.insert(enrollments).values({
            id: enrollmentId,
            userId: session.user.id,
            courseId,
        });
        
        const enrollment = { id: enrollmentId, userId: session.user.id, courseId };

        // Send enrollment email (non-blocking)
        if (session.user.email && session.user.name) {
            sendEnrollmentEmail({
                email: session.user.email,
                name: session.user.name,
                courseName: course.title,
                courseSlug: course.slug,
            }).catch((err) => console.error("Failed to send enrollment email:", err));
        }

        return NextResponse.json(enrollment, { status: 201 });
    } catch (error) {
        console.error("Error enrolling:", error);
        return NextResponse.json(
            { error: "Failed to enroll" },
            { status: 500 }
        );
    }
}

// GET /api/enroll?courseId=xxx - Check enrollment status
export async function GET(request: Request) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ enrolled: false });
        }

        const { searchParams } = new URL(request.url);
        const courseId = searchParams.get("courseId");

        if (!courseId) {
            return NextResponse.json(
                { error: "Course ID required" },
                { status: 400 }
            );
        }

        const enrollment = await db.query.enrollments.findFirst({
            where: and(
                eq(enrollments.userId, session.user.id),
                eq(enrollments.courseId, courseId)
            ),
        });

        return NextResponse.json({
            enrolled: !!enrollment,
            enrollment: enrollment || null,
        });
    } catch (error) {
        console.error("Error checking enrollment:", error);
        return NextResponse.json(
            { error: "Failed to check enrollment" },
            { status: 500 }
        );
    }
}

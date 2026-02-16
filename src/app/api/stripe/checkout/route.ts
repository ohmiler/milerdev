import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { courses, payments, coupons, couponUsages, enrollments } from "@/lib/db/schema";
import { eq, and, count } from "drizzle-orm";
import { calculateDiscount, validateCouponEligibility } from "@/lib/coupon";
import { checkRateLimit, rateLimits, rateLimitResponse } from "@/lib/rate-limit";

// POST /api/stripe/checkout - Create Stripe checkout session
export async function POST(request: Request) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const rateLimit = checkRateLimit(`checkout:${session.user.id}`, rateLimits.sensitive);
        if (!rateLimit.success) {
            return rateLimitResponse(rateLimit.resetTime);
        }

        const { courseId, couponId } = await request.json();

        // Get course details
        const course = await db.query.courses.findFirst({
            where: eq(courses.id, courseId),
        });

        if (!course || course.status !== 'published') {
            return NextResponse.json({ error: "Course not found" }, { status: 404 });
        }

        // Check if already enrolled — prevent paying for a course the user already has
        const existingEnrollment = await db.query.enrollments.findFirst({
            where: and(
                eq(enrollments.userId, session.user.id),
                eq(enrollments.courseId, courseId)
            ),
        });
        if (existingEnrollment) {
            return NextResponse.json(
                { error: "คุณลงทะเบียนคอร์สนี้แล้ว" },
                { status: 400 }
            );
        }

        const originalPrice = parseFloat(course.price.toString());

        // Check if promotion is active
        const now = new Date();
        const hasPromo = course.promoPrice !== null && course.promoPrice !== undefined;
        const promoStartOk = !course.promoStartsAt || new Date(course.promoStartsAt) <= now;
        const promoEndOk = !course.promoEndsAt || new Date(course.promoEndsAt) >= now;
        const isPromoActive = hasPromo && promoStartOk && promoEndOk;
        let priceNumber = isPromoActive ? parseFloat(course.promoPrice!.toString()) : originalPrice;

        // Apply coupon discount if provided
        let appliedCouponId: string | null = null;
        if (couponId) {
            const [coupon] = await db.select().from(coupons).where(eq(coupons.id, couponId)).limit(1);
            if (coupon) {
                const [userUsage] = await db.select({ count: count() }).from(couponUsages)
                    .where(and(eq(couponUsages.couponId, coupon.id), eq(couponUsages.userId, session.user.id)));

                const eligibility = validateCouponEligibility(coupon, {
                    targetCourseId: courseId,
                    userUsageCount: userUsage?.count || 0,
                    coursePrice: priceNumber,
                });

                if (eligibility.valid) {
                    const discount = calculateDiscount(
                        priceNumber,
                        coupon.discountType as 'percentage' | 'fixed',
                        coupon.discountValue,
                        coupon.maxDiscount,
                    );
                    priceNumber = Math.max(0, priceNumber - discount);
                    appliedCouponId = coupon.id;
                }
            }
        }

        if (priceNumber <= 0) {
            return NextResponse.json(
                { error: "This course is free" },
                { status: 400 }
            );
        }

        // Reuse existing pending payment or create new one
        const [existingPending] = await db
            .select()
            .from(payments)
            .where(
                and(
                    eq(payments.userId, session.user.id),
                    eq(payments.courseId, course.id),
                    eq(payments.status, 'pending'),
                    eq(payments.method, 'stripe')
                )
            )
            .limit(1);

        let paymentId: string;
        if (existingPending) {
            paymentId = existingPending.id;
            await db.update(payments).set({
                amount: priceNumber.toString(),
            }).where(eq(payments.id, existingPending.id));
        } else {
            paymentId = crypto.randomUUID();
            await db.insert(payments).values({
                id: paymentId,
                userId: session.user.id,
                courseId: course.id,
                amount: priceNumber.toString(),
                currency: "THB",
                method: "stripe",
                itemTitle: course.title,
                status: "pending",
            });
        }

        // Create Stripe checkout session
        const checkoutSession = await stripe.checkout.sessions.create({
            mode: "payment",
            payment_method_types: ["card"],
            line_items: [
                {
                    price_data: {
                        currency: "thb",
                        product_data: {
                            name: course.title,
                            description: course.description
                                ? course.description.replace(/<[^>]*>/g, '').substring(0, 500)
                                : undefined,
                            images: course.thumbnailUrl ? [course.thumbnailUrl] : undefined,
                        },
                        unit_amount: Math.round(priceNumber * 100), // Convert to satang
                    },
                    quantity: 1,
                },
            ],
            metadata: {
                paymentId: paymentId,
                userId: session.user.id,
                courseId: course.id,
                type: "course",
                ...(appliedCouponId && { couponId: appliedCouponId }),
            },
            success_url: `${process.env.NEXT_PUBLIC_APP_URL}/courses/${course.slug}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/courses/${course.slug}?payment=cancelled`,
        });

        return NextResponse.json({
            url: checkoutSession.url,
            sessionId: checkoutSession.id,
        });
    } catch (error) {
        console.error("Error creating checkout:", error);
        return NextResponse.json(
            { error: "Failed to create checkout session" },
            { status: 500 }
        );
    }
}

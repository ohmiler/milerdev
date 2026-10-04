import { NextResponse } from "next/server";
import { z } from 'zod';
import { auth } from "@/lib/auth";
import { stripe } from "@/lib/commerce/stripe";
import { db } from "@/lib/db";
import { courses, payments, enrollments } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { checkRateLimit, rateLimits, rateLimitResponse } from "@/lib/security/rate-limit";
import { COURSE_NOT_READY, requireCourseHasLessons } from "@/lib/courses/availability";
import { logError } from '@/lib/error-handler';

const stripeCheckoutRequestSchema = z.object({
    courseId: z.string().trim().min(1).max(36),
    // Ignored: purchase attribution was removed, and pages loaded before that deploy still send it.
    exposureId: z.string().max(64).optional(),
    expectedAmount: z.string().regex(/^\d{1,8}\.\d{2}$/).optional(),
}).strict();


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

        const parsed = stripeCheckoutRequestSchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) {
            return NextResponse.json({ error: "Invalid checkout request" }, { status: 400 });
        }
        const { courseId } = parsed.data;

        // Get course details
        const course = await db.query.courses.findFirst({
            where: eq(courses.id, courseId),
            with: { lessons: { columns: { id: true } } },
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

        try {
            requireCourseHasLessons(course.lessons.length);
        } catch {
            return NextResponse.json({ error: COURSE_NOT_READY }, { status: 409 });
        }

        const originalPrice = parseFloat(course.price.toString());

        // Check if promotion is active
        const now = new Date();
        const hasPromo = course.promoPrice !== null && course.promoPrice !== undefined;
        const promoStartOk = !course.promoStartsAt || new Date(course.promoStartsAt) <= now;
        const promoEndOk = !course.promoEndsAt || new Date(course.promoEndsAt) >= now;
        const isPromoActive = hasPromo && promoStartOk && promoEndOk;
        let priceNumber = isPromoActive ? parseFloat(course.promoPrice!.toString()) : originalPrice;

        priceNumber = Math.round(priceNumber * 100) / 100;
        if (priceNumber <= 0) {
            return NextResponse.json(
                { error: "This course is free" },
                { status: 400 }
            );
        }

        if (parsed.data.expectedAmount !== undefined && parsed.data.expectedAmount !== priceNumber.toFixed(2)) {
            return NextResponse.json({ error: 'ราคาเปลี่ยนแปลง กรุณาตรวจสอบรายการและยืนยันยอดใหม่' }, { status: 409 });
        }

        // A checkout session is an immutable payment attempt. Reusing and repricing
        // an older pending row would let multiple Stripe sessions point at mutable
        // local state and can strand a successfully paid session.

        const paymentId = crypto.randomUUID();
        const paymentValues: typeof payments.$inferInsert = {
            id: paymentId,
            userId: session.user.id,
            courseId: course.id,
            amount: priceNumber.toFixed(2),
            currency: "THB",
            method: "stripe",
            itemTitle: course.title,
            status: "pending",
        };
        await db.insert(payments).values(paymentValues);

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
            },
            success_url: `${process.env.NEXT_PUBLIC_APP_URL}/courses/${course.slug}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/courses/${course.slug}?payment=cancelled`,
        }, {
            idempotencyKey: `checkout:${paymentId}`,
        });

        return NextResponse.json({
            url: checkoutSession.url,
            sessionId: checkoutSession.id,
        });
    } catch (error) {
        logError(error, { action: 'stripe.checkout.create_failed' });
        return NextResponse.json(
            { error: "Failed to create checkout session" },
            { status: 500 }
        );
    }
}


import { withBrowserConsent } from '@/lib/privacy-consent';
import { getMeasurementDatabase } from '@/lib/measurement-database';
import { NextResponse } from "next/server";
import { z } from 'zod';
import { auth } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { payments } from "@/lib/db/schema";
import { resolveCourseAcquisition } from "@/lib/course-acquisition";
import { checkRateLimit, rateLimits, rateLimitResponse } from "@/lib/rate-limit";
import { COURSE_NOT_READY } from "@/lib/course-availability";
import { analyticsExposureIdSchema } from '@/lib/analytics-contract';
import { logEvent } from '@/lib/error-handler';
import { measurementRecorder } from '@/lib/measurement-recorder';

const stripeCheckoutRequestSchema = z.object({
    courseId: z.string().trim().min(1).max(36),
    couponId: z.string().trim().min(1).max(36).optional(),
    exposureId: analyticsExposureIdSchema.optional(),
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
        const { courseId, couponId, exposureId } = parsed.data;

        const decision = await resolveCourseAcquisition({
            kind: 'checkout', userId: session.user.id, courseId, couponId,
        });
        if (decision.kind === 'not_found') {
            return NextResponse.json({ error: "Course not found" }, { status: 404 });
        }
        if (decision.kind === 'owned') {
            return NextResponse.json({ error: "คุณลงทะเบียนคอร์สนี้แล้ว" }, { status: 400 });
        }
        if (decision.kind === 'not_ready') {
            return NextResponse.json({ error: COURSE_NOT_READY }, { status: 409 });
        }
        if (decision.kind !== 'ready') {
            return NextResponse.json({ error: 'คูปองนี้ใช้ไม่ได้แล้ว กรุณาตรวจสอบรายการใหม่' }, { status: 400 });
        }
        const { course } = decision;
        const appliedCouponId = decision.coupon?.id ?? null;
        const priceNumber = Number(decision.price.amountDue);
        if (decision.action === 'enroll-free') {
            return NextResponse.json({ error: "This course is free" }, { status: 400 });
        }
        if (parsed.data.expectedAmount !== undefined && parsed.data.expectedAmount !== decision.price.amountDue) {
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
            couponId: appliedCouponId,
            amount: decision.price.amountDue,
            currency: "THB",
            attributedExposureId: null,
            method: "stripe",
            itemTitle: course.title,
            status: "pending",
        };
        let insertedWithConsent = false;
        if (exposureId) {
            try {
                insertedWithConsent = await withBrowserConsent(session.user.id, async () => {
                    const attributedExposureId = await measurementRecorder.resolveProductExposureAttribution({
                        exposureId,
                        productType: 'course',
                        productId: course.id,
                    });
                    // Hold the receipt lock until the attributed payment write commits.
                    await getMeasurementDatabase().insert(payments).values({ ...paymentValues, attributedExposureId });
                    return true;
                }, () => false);
            } catch {
                logEvent('analytics.payment_attribution_failed', 'warn');
            }
        }
        if (!insertedWithConsent) await db.insert(payments).values(paymentValues);

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
        }, {
            idempotencyKey: `checkout:${paymentId}`,
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


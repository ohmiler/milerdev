import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { payments, courses, bundles, bundleCourses, coupons, couponUsages } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { sendPaymentConfirmation, sendEnrollmentEmail } from "@/lib/email";
import Stripe from "stripe";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { safeInsertEnrollment, isDuplicateKeyError } from "@/lib/db/safe-insert";

export async function POST(request: Request) {
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get("stripe-signature")!;

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(
            body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET!
        );
    } catch (error) {
        console.error("Webhook signature verification failed:", error);
        return NextResponse.json(
            { error: "Invalid signature" },
            { status: 400 }
        );
    }

    if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;
        const { paymentId, userId, courseId, bundleId, type, couponId } = session.metadata || {};

        if (!paymentId || !userId) {
            console.error("Webhook missing required metadata:", session.metadata);
            return NextResponse.json({ received: true });
        }

        // Cross-check: verify payment row exists and metadata matches DB record
        const [paymentRow] = await db
            .select()
            .from(payments)
            .where(eq(payments.id, paymentId));

        if (!paymentRow) {
            console.error(`[Webhook] Payment ${paymentId} not found in DB`);
            return NextResponse.json({ received: true });
        }
        if (paymentRow.userId !== userId) {
            console.error(`[Webhook] userId mismatch: metadata=${userId}, db=${paymentRow.userId}`);
            return NextResponse.json({ received: true });
        }
        if (type === 'course' && courseId && paymentRow.courseId && paymentRow.courseId !== courseId) {
            console.error(`[Webhook] courseId mismatch: metadata=${courseId}, db=${paymentRow.courseId}`);
            return NextResponse.json({ received: true });
        }
        if (type === 'bundle' && bundleId && paymentRow.bundleId && paymentRow.bundleId !== bundleId) {
            console.error(`[Webhook] bundleId mismatch: metadata=${bundleId}, db=${paymentRow.bundleId}`);
            return NextResponse.json({ received: true });
        }

        // Strict type invariant: metadata type must match payment row shape
        const isCoursePayment = !!paymentRow.courseId && !paymentRow.bundleId;
        const isBundlePayment = !!paymentRow.bundleId && !paymentRow.courseId;
        if (type === 'course' && !isCoursePayment) {
            console.error(`[Webhook] type=course but payment row is not a course payment (id=${paymentId})`);
            return NextResponse.json({ received: true });
        }
        if (type === 'bundle' && !isBundlePayment) {
            console.error(`[Webhook] type=bundle but payment row is not a bundle payment (id=${paymentId})`);
            return NextResponse.json({ received: true });
        }

        // Verify amount and currency match between Stripe and DB
        const stripeAmountTotal = session.amount_total; // in satang (smallest unit)
        const dbAmountSatang = Math.round(parseFloat(paymentRow.amount.toString()) * 100);
        if (stripeAmountTotal && Math.abs(stripeAmountTotal - dbAmountSatang) > 1) {
            console.error(`[Webhook] Amount mismatch: stripe=${stripeAmountTotal}, db=${dbAmountSatang} (paymentId=${paymentId})`);
            return NextResponse.json({ received: true });
        }
        const stripeCurrency = session.currency?.toLowerCase();
        if (stripeCurrency && paymentRow.currency && stripeCurrency !== paymentRow.currency.toLowerCase()) {
            console.error(`[Webhook] Currency mismatch: stripe=${stripeCurrency}, db=${paymentRow.currency} (paymentId=${paymentId})`);
            return NextResponse.json({ received: true });
        }

        // Step 1: Update payment status (always do this first)
        try {
            await db
                .update(payments)
                .set({
                    status: "completed",
                    stripePaymentId: session.payment_intent as string,
                })
                .where(eq(payments.id, paymentId));
        } catch (error) {
            console.error(`Failed to update payment ${paymentId}:`, error);
            return NextResponse.json(
                { error: "Failed to update payment" },
                { status: 500 }
            );
        }

        // Step 2: Enroll and send emails
        try {
            const payment = paymentRow;

            const customerEmail = session.customer_details?.email;
            const customerName = session.customer_details?.name || "คุณลูกค้า";

            if (type === "bundle" && bundleId) {
                // ===== BUNDLE PAYMENT =====
                const bCourses = await db
                    .select({ courseId: bundleCourses.courseId, courseSlug: courses.slug })
                    .from(bundleCourses)
                    .innerJoin(courses, eq(bundleCourses.courseId, courses.id))
                    .where(eq(bundleCourses.bundleId, bundleId));

                for (const bc of bCourses) {
                    try {
                        await safeInsertEnrollment(userId, bc.courseId);
                    } catch (enrollError) {
                        console.error(`Failed to enroll user ${userId} in course ${bc.courseId}:`, enrollError);
                    }
                }

                const [bundle] = await db.select().from(bundles).where(eq(bundles.id, bundleId)).limit(1);

                if (customerEmail && bundle) {
                    try {
                        await sendPaymentConfirmation({
                            email: customerEmail,
                            name: customerName,
                            courseName: `${bundle.title} (Bundle)`,
                            amount: parseFloat(payment.amount.toString()),
                            paymentId: payment.id,
                        });
                        await sendEnrollmentEmail({
                            email: customerEmail,
                            name: customerName,
                            courseName: `${bundle.title} (${bCourses.length} คอร์ส)`,
                            courseSlug: bCourses[0]?.courseSlug || "",
                        });
                    } catch (emailError) {
                        console.error("Failed to send bundle emails:", emailError);
                    }
                }

                await trackAnalyticsEvent({
                    eventName: "payment_success",
                    userId,
                    bundleId,
                    paymentId: payment.id,
                    source: "server",
                    metadata: {
                        itemType: "bundle",
                        paymentMethod: "stripe",
                        amount: parseFloat(payment.amount.toString()),
                    },
                    ipAddress: "unknown",
                    userAgent: headersList.get("user-agent") || "unknown",
                });

                console.log(`[Webhook] Bundle payment ${paymentId} completed, enrolled in ${bCourses.length} courses`);
            } else if (type === "course" && courseId) {
                // ===== SINGLE COURSE PAYMENT =====
                await safeInsertEnrollment(userId, courseId);

                const course = await db.query.courses.findFirst({
                    where: eq(courses.id, courseId),
                });

                if (customerEmail && course) {
                    try {
                        await sendPaymentConfirmation({
                            email: customerEmail,
                            name: customerName,
                            courseName: course.title,
                            amount: parseFloat(payment.amount.toString()),
                            paymentId: payment.id,
                        });
                        await sendEnrollmentEmail({
                            email: customerEmail,
                            name: customerName,
                            courseName: course.title,
                            courseSlug: course.slug,
                        });
                    } catch (emailError) {
                        console.error("Failed to send course emails:", emailError);
                    }
                }

                await trackAnalyticsEvent({
                    eventName: "payment_success",
                    userId,
                    courseId,
                    paymentId: payment.id,
                    source: "server",
                    metadata: {
                        itemType: "course",
                        paymentMethod: "stripe",
                        amount: parseFloat(payment.amount.toString()),
                    },
                    ipAddress: "unknown",
                    userAgent: headersList.get("user-agent") || "unknown",
                });

                console.log(`[Webhook] Payment ${paymentId} completed and enrollment created`);
            }

            // Record coupon usage if coupon was applied (idempotent — skip if already recorded)
            if (couponId && userId) {
                try {
                    const targetCourseId = type === 'course' ? courseId : null;
                    try {
                        await db.insert(couponUsages).values({
                            couponId,
                            userId,
                            ...(targetCourseId && { courseId: targetCourseId }),
                            discountAmount: '0',
                        });
                        await db.update(coupons)
                            .set({ usageCount: sql`${coupons.usageCount} + 1` })
                            .where(eq(coupons.id, couponId));
                        console.log(`[Webhook] Coupon ${couponId} usage recorded`);
                    } catch (dupErr) {
                        if (isDuplicateKeyError(dupErr)) {
                            console.log(`[Webhook] Coupon ${couponId} usage already recorded, skipping`);
                        } else {
                            throw dupErr;
                        }
                    }
                } catch (couponError) {
                    console.error('Failed to record coupon usage:', couponError);
                }
            }
        } catch (error) {
            console.error("Error processing enrollment/emails:", error);
            // Payment already updated — don't return 500 to avoid Stripe retries
        }
    }

    return NextResponse.json({ received: true });
}

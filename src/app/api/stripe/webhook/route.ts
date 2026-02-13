import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { payments, enrollments, courses, bundles, bundleCourses, coupons, couponUsages } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { sendPaymentConfirmation, sendEnrollmentEmail } from "@/lib/email";
import Stripe from "stripe";

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
            const [payment] = await db
                .select()
                .from(payments)
                .where(eq(payments.id, paymentId));

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
                        const existing = await db.query.enrollments.findFirst({
                            where: and(eq(enrollments.userId, userId), eq(enrollments.courseId, bc.courseId)),
                        });
                        if (!existing) {
                            await db.insert(enrollments).values({ userId, courseId: bc.courseId });
                        }
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

                console.log(`[Webhook] Bundle payment ${paymentId} completed, enrolled in ${bCourses.length} courses`);
            } else if (courseId) {
                // ===== SINGLE COURSE PAYMENT =====
                const existingEnrollment = await db.query.enrollments.findFirst({
                    where: and(eq(enrollments.userId, userId), eq(enrollments.courseId, courseId)),
                });

                if (!existingEnrollment) {
                    await db.insert(enrollments).values({ userId, courseId });
                }

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

                console.log(`[Webhook] Payment ${paymentId} completed and enrollment created`);
            }

            // Record coupon usage if coupon was applied (idempotent — skip if already recorded)
            if (couponId && userId) {
                try {
                    const [existingUsage] = await db.select({ id: couponUsages.id }).from(couponUsages)
                        .where(and(
                            eq(couponUsages.couponId, couponId),
                            eq(couponUsages.userId, userId),
                            ...(type === 'course' && courseId ? [eq(couponUsages.courseId, courseId)] : []),
                        ))
                        .limit(1);

                    if (!existingUsage) {
                        const targetCourseId = type === 'course' ? courseId : null;
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
                    } else {
                        console.log(`[Webhook] Coupon ${couponId} usage already recorded, skipping`);
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

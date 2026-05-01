import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { payments, courses, bundles, bundleCourses, coupons, couponUsages, enrollments, stripeEvents } from "@/lib/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { sendPaymentConfirmation, sendEnrollmentEmail } from "@/lib/email";
import Stripe from "stripe";
import { isDuplicateKeyError } from "@/lib/db/safe-insert";

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

        if (session.payment_status !== "paid") {
            console.error(`[Webhook] checkout.session.completed but payment_status=${session.payment_status} (paymentId=${paymentId})`);
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

        const payment = paymentRow;
        const customerEmail = session.customer_details?.email;
        const customerName = session.customer_details?.name || "Customer";
        let bundleEmailData: { title: string; courseCount: number; firstCourseSlug: string } | null = null;
        let courseEmailData: { title: string; slug: string } | null = null;

        try {
            await db.transaction(async (tx) => {
                await tx.insert(stripeEvents).values({
                    id: event.id,
                    type: event.type,
                    paymentId,
                    processedAt: new Date(),
                });

                if (type === "bundle" && bundleId) {
                    const bCourses = await tx
                        .select({ courseId: bundleCourses.courseId, courseSlug: courses.slug })
                        .from(bundleCourses)
                        .innerJoin(courses, eq(bundleCourses.courseId, courses.id))
                        .where(eq(bundleCourses.bundleId, bundleId));

                    for (const bc of bCourses) {
                        try {
                            await tx.insert(enrollments).values({ userId, courseId: bc.courseId });
                        } catch (enrollError) {
                            if (!isDuplicateKeyError(enrollError)) {
                                throw enrollError;
                            }
                        }
                    }

                    const [bundle] = await tx.select().from(bundles).where(eq(bundles.id, bundleId)).limit(1);
                    if (bundle) {
                        bundleEmailData = {
                            title: bundle.title,
                            courseCount: bCourses.length,
                            firstCourseSlug: bCourses[0]?.courseSlug || "",
                        };
                    }
                } else if (type === "course" && courseId) {
                    try {
                        await tx.insert(enrollments).values({ userId, courseId });
                    } catch (enrollError) {
                        if (!isDuplicateKeyError(enrollError)) {
                            throw enrollError;
                        }
                    }

                    const course = await tx.query.courses.findFirst({
                        where: eq(courses.id, courseId),
                    });
                    if (course) {
                        courseEmailData = { title: course.title, slug: course.slug };
                    }
                }

                if (couponId && userId) {
                    const targetCourseId = type === 'course' ? courseId : null;
                    let couponUsageCreated = false;
                    try {
                        await tx.insert(couponUsages).values({
                            couponId,
                            userId,
                            ...(targetCourseId && { courseId: targetCourseId }),
                            discountAmount: '0',
                        });
                        couponUsageCreated = true;
                    } catch (dupErr) {
                        if (!isDuplicateKeyError(dupErr)) {
                            throw dupErr;
                        }
                    }

                    if (couponUsageCreated) {
                        const couponUpdate = await tx.update(coupons)
                            .set({ usageCount: sql`${coupons.usageCount} + 1` })
                            .where(and(
                                eq(coupons.id, couponId),
                                sql`(${coupons.usageLimit} IS NULL OR ${coupons.usageCount} < ${coupons.usageLimit})`
                            ));
                        const affectedRows = Array.isArray(couponUpdate)
                            ? couponUpdate[0]?.affectedRows
                            : undefined;
                        if (affectedRows === 0) {
                            throw new Error('COUPON_LIMIT_EXCEEDED');
                        }
                    }
                }

                await tx
                    .update(payments)
                    .set({
                        status: "completed",
                        stripePaymentId: session.payment_intent as string,
                    })
                    .where(eq(payments.id, paymentId));
            });
        } catch (error) {
            if (isDuplicateKeyError(error)) {
                console.log(`[Webhook] Stripe event ${event.id} already processed, skipping`);
                return NextResponse.json({ received: true });
            }
            console.error("Error processing Stripe fulfillment:", error);
            return NextResponse.json(
                { error: "Failed to process payment fulfillment" },
                { status: 500 }
            );
        }

        const bundleDetails = bundleEmailData as { title: string; courseCount: number; firstCourseSlug: string } | null;
        const courseDetails = courseEmailData as { title: string; slug: string } | null;

        if (customerEmail && bundleDetails) {
            Promise.all([
                sendPaymentConfirmation({
                    email: customerEmail,
                    name: customerName,
                    courseName: `${bundleDetails.title} (Bundle)`,
                    amount: parseFloat(payment.amount.toString()),
                    paymentId: payment.id,
                }),
                sendEnrollmentEmail({
                    email: customerEmail,
                    name: customerName,
                    courseName: `${bundleDetails.title} (${bundleDetails.courseCount} courses)`,
                    courseSlug: bundleDetails.firstCourseSlug,
                }),
            ]).catch((emailError) => console.error("Failed to send bundle emails:", emailError));
        } else if (customerEmail && courseDetails) {
            Promise.all([
                sendPaymentConfirmation({
                    email: customerEmail,
                    name: customerName,
                    courseName: courseDetails.title,
                    amount: parseFloat(payment.amount.toString()),
                    paymentId: payment.id,
                }),
                sendEnrollmentEmail({
                    email: customerEmail,
                    name: customerName,
                    courseName: courseDetails.title,
                    courseSlug: courseDetails.slug,
                }),
            ]).catch((emailError) => console.error("Failed to send course emails:", emailError));
        }

        console.log(`[Webhook] Payment ${paymentId} fulfilled`);
        return NextResponse.json({ received: true });
    }

    return NextResponse.json({ received: true });
}


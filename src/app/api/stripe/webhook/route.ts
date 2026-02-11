import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { payments, enrollments, courses, bundles, bundleCourses } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
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
        const { paymentId, userId, courseId, bundleId, type } = session.metadata!;

        try {
            // Update payment status
            await db
                .update(payments)
                .set({
                    status: "completed",
                    stripePaymentId: session.payment_intent as string,
                })
                .where(eq(payments.id, paymentId));

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
                    const existing = await db.query.enrollments.findFirst({
                        where: and(eq(enrollments.userId, userId), eq(enrollments.courseId, bc.courseId)),
                    });
                    if (!existing) {
                        await db.insert(enrollments).values({ userId, courseId: bc.courseId });
                    }
                }

                const [bundle] = await db.select().from(bundles).where(eq(bundles.id, bundleId)).limit(1);

                if (customerEmail && bundle) {
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
                }

                console.log(`Bundle payment ${paymentId} completed, enrolled in ${bCourses.length} courses`);
            } else if (courseId) {
                // ===== SINGLE COURSE PAYMENT =====
                const existingEnrollment = await db.query.enrollments.findFirst({
                    where: and(eq(enrollments.userId, userId), eq(enrollments.courseId, courseId)),
                });

                if (existingEnrollment) {
                    console.log(`User ${userId} already enrolled in course ${courseId}, skipping`);
                    return NextResponse.json({ received: true });
                }

                await db.insert(enrollments).values({ userId, courseId });

                const course = await db.query.courses.findFirst({
                    where: eq(courses.id, courseId),
                });

                if (customerEmail && course) {
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
                }

                console.log(`Payment ${paymentId} completed and enrollment created`);
            }
        } catch (error) {
            console.error("Error processing webhook:", error);
            return NextResponse.json(
                { error: "Webhook processing failed" },
                { status: 500 }
            );
        }
    }

    return NextResponse.json({ received: true });
}

import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { payments, enrollments, courses } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
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
        const { paymentId, userId, courseId } = session.metadata!;

        try {
            // Update payment status
            await db
                .update(payments)
                .set({
                    status: "completed",
                    stripePaymentId: session.payment_intent as string,
                })
                .where(eq(payments.id, paymentId));

            // Create enrollment
            await db.insert(enrollments).values({
                userId,
                courseId,
            });

            // Get course and user for email
            const [payment] = await db
                .select()
                .from(payments)
                .where(eq(payments.id, paymentId));

            const course = await db.query.courses.findFirst({
                where: eq(courses.id, courseId),
            });

            // Send confirmation emails
            if (session.customer_details?.email && course) {
                await sendPaymentConfirmation({
                    email: session.customer_details.email,
                    name: session.customer_details.name || "คุณลูกค้า",
                    courseName: course.title,
                    amount: parseFloat(payment.amount.toString()),
                    paymentId: payment.id,
                });

                await sendEnrollmentEmail({
                    email: session.customer_details.email,
                    name: session.customer_details.name || "คุณลูกค้า",
                    courseName: course.title,
                    courseSlug: course.slug,
                });
            }

            console.log(`Payment ${paymentId} completed and enrollment created`);
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

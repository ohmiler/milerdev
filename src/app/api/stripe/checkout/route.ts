import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { courses, payments } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
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

        const { courseId } = await request.json();

        // Get course details
        const course = await db.query.courses.findFirst({
            where: eq(courses.id, courseId),
        });

        if (!course) {
            return NextResponse.json({ error: "Course not found" }, { status: 404 });
        }

        const originalPrice = parseFloat(course.price.toString());

        // Check if promotion is active
        const now = new Date();
        const hasPromo = course.promoPrice !== null && course.promoPrice !== undefined;
        const promoStartOk = !course.promoStartsAt || new Date(course.promoStartsAt) <= now;
        const promoEndOk = !course.promoEndsAt || new Date(course.promoEndsAt) >= now;
        const isPromoActive = hasPromo && promoStartOk && promoEndOk;
        const priceNumber = isPromoActive ? parseFloat(course.promoPrice!.toString()) : originalPrice;

        if (priceNumber <= 0) {
            return NextResponse.json(
                { error: "This course is free" },
                { status: 400 }
            );
        }

        // Create pending payment record
        const paymentId = crypto.randomUUID();
        await db
            .insert(payments)
            .values({
                id: paymentId,
                userId: session.user.id,
                courseId: course.id,
                amount: priceNumber.toString(),
                currency: "THB",
                method: "stripe",
                itemTitle: course.title,
                status: "pending",
            });

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
                            description: course.description || undefined,
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
            success_url: `${process.env.NEXT_PUBLIC_APP_URL}/courses/${course.slug}/payment-success`,
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

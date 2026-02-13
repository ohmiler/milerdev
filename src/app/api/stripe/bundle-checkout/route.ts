import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { bundles, bundleCourses, courses, payments } from "@/lib/db/schema";
import { eq, asc, and } from "drizzle-orm";
import { checkRateLimit, rateLimits, rateLimitResponse } from "@/lib/rate-limit";

// POST /api/stripe/bundle-checkout - Create Stripe checkout session for bundle
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

        const { bundleId } = await request.json();

        // Get bundle details
        const [bundle] = await db
            .select()
            .from(bundles)
            .where(eq(bundles.id, bundleId))
            .limit(1);

        if (!bundle || bundle.status !== "published") {
            return NextResponse.json({ error: "Bundle not found" }, { status: 404 });
        }

        const priceNumber = parseFloat(bundle.price);

        if (priceNumber <= 0) {
            return NextResponse.json(
                { error: "This bundle is free" },
                { status: 400 }
            );
        }

        // Get courses in bundle for description
        const bCourses = await db
            .select({ courseTitle: courses.title })
            .from(bundleCourses)
            .innerJoin(courses, eq(bundleCourses.courseId, courses.id))
            .where(eq(bundleCourses.bundleId, bundleId))
            .orderBy(asc(bundleCourses.orderIndex));

        const courseNames = bCourses.map(c => c.courseTitle).join(', ');

        // Reuse existing pending payment or create new one
        const [existingPending] = await db
            .select()
            .from(payments)
            .where(
                and(
                    eq(payments.userId, session.user.id),
                    eq(payments.bundleId, bundle.id),
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
                bundleId: bundle.id,
                amount: priceNumber.toString(),
                currency: "THB",
                method: "stripe",
                itemTitle: `📦 ${bundle.title}`,
                status: "pending",
            });
        }

        // Normalize thumbnail URL
        const thumbnailUrl = bundle.thumbnailUrl
            ? (bundle.thumbnailUrl.startsWith('http') ? bundle.thumbnailUrl : `https://${bundle.thumbnailUrl}`)
            : undefined;

        // Create Stripe checkout session
        const checkoutSession = await stripe.checkout.sessions.create({
            mode: "payment",
            payment_method_types: ["card"],
            line_items: [
                {
                    price_data: {
                        currency: "thb",
                        product_data: {
                            name: `📦 ${bundle.title}`,
                            description: `Bundle ${bCourses.length} คอร์ส: ${courseNames}`,
                            images: thumbnailUrl ? [thumbnailUrl] : undefined,
                        },
                        unit_amount: Math.round(priceNumber * 100), // Convert to satang
                    },
                    quantity: 1,
                },
            ],
            metadata: {
                paymentId,
                userId: session.user.id,
                bundleId: bundle.id,
                type: "bundle",
            },
            success_url: `${process.env.NEXT_PUBLIC_APP_URL}/bundles/${bundle.slug}/payment-success`,
            cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/bundles/${bundle.slug}?payment=cancelled`,
        });

        return NextResponse.json({
            url: checkoutSession.url,
            sessionId: checkoutSession.id,
        });
    } catch (error) {
        console.error("Error creating bundle checkout:", error);
        return NextResponse.json(
            { error: "Failed to create checkout session" },
            { status: 500 }
        );
    }
}

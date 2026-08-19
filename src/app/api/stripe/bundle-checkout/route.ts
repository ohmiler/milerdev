import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { bundles, bundleCourses, courses, enrollments, lessons, payments } from "@/lib/db/schema";
import { eq, asc, and, count, inArray } from "drizzle-orm";
import { checkRateLimit, rateLimits, rateLimitResponse } from "@/lib/rate-limit";
import { requirePublishedBundleCourses, requireReadyBundleCourses } from '@/lib/bundle-commerce';

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
            .select({ courseId: bundleCourses.courseId, courseTitle: courses.title, courseStatus: courses.status })
            .from(bundleCourses)
            .innerJoin(courses, eq(bundleCourses.courseId, courses.id))
            .where(eq(bundleCourses.bundleId, bundleId))
            .orderBy(asc(bundleCourses.orderIndex));

        try {
            requirePublishedBundleCourses(bCourses.map((course) => ({
                id: course.courseId,
                status: course.courseStatus,
            })));
        } catch {
            return NextResponse.json({ error: 'Bundle not available' }, { status: 409 });
        }

        const lessonCountRows = await db.select({
            courseId: lessons.courseId,
            lessonCount: count(lessons.id),
        }).from(lessons)
            .where(inArray(lessons.courseId, bCourses.map((course) => course.courseId)))
            .groupBy(lessons.courseId);
        const lessonCounts = new Map(lessonCountRows.map((row) => [row.courseId, row.lessonCount]));
        try {
            requireReadyBundleCourses(bCourses.map((course) => ({
                id: course.courseId,
                status: course.courseStatus,
                lessonCount: lessonCounts.get(course.courseId) ?? 0,
            })));
        } catch {
            return NextResponse.json({ error: 'BUNDLE_NOT_READY' }, { status: 409 });
        }

        // Check if user is already enrolled in all courses
        const enrollmentChecks = await Promise.all(
            bCourses.map(async (c) => {
                const [enrollment] = await db
                    .select()
                    .from(enrollments)
                    .where(and(eq(enrollments.userId, session.user.id), eq(enrollments.courseId, c.courseId)))
                    .limit(1);
                return !!enrollment;
            })
        );
        if (enrollmentChecks.every(Boolean)) {
            return NextResponse.json(
                { error: "คุณลงทะเบียนคอร์สทั้งหมดใน Bundle นี้แล้ว" },
                { status: 400 }
            );
        }

        const courseNames = bCourses.map(c => c.courseTitle).join(', ');

        // A checkout session is an immutable payment attempt. Reusing and repricing
        // an older pending row would let multiple Stripe sessions point at mutable
        // local state and can strand a successfully paid session.
        const paymentId = crypto.randomUUID();
        await db.insert(payments).values({
            id: paymentId,
            userId: session.user.id,
            bundleId: bundle.id,
            amount: priceNumber.toFixed(2),
            currency: "THB",
            method: "stripe",
            itemTitle: `📦 ${bundle.title}`,
            status: "pending",
        });

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
            success_url: `${process.env.NEXT_PUBLIC_APP_URL}/bundles/${bundle.slug}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/bundles/${bundle.slug}?payment=cancelled`,
        }, {
            idempotencyKey: `checkout:${paymentId}`,
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


import { NextResponse } from "next/server";
import { logError } from '@/lib/error-handler';
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { enrollments, courses, payments } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { sendEnrollmentEmail } from "@/lib/notifications/email";
import { z } from "zod";
import { checkRateLimit, rateLimits, rateLimitResponse } from "@/lib/security/rate-limit";
import { safeInsertEnrollment } from "@/lib/db/safe-insert";
import { COURSE_NOT_READY, requireCourseHasLessons } from "@/lib/courses/availability";
import { fulfillFreeEnrollment } from '@/lib/commerce/free-enrollment-fulfillment';

// Validation schema
const enrollSchema = z.object({
    courseId: z.string().min(1, "Course ID is required"),
    paymentId: z.string().optional(),
});

// POST /api/enroll - Enroll in a course
export async function POST(request: Request) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const rateLimit = checkRateLimit(`enroll:${session.user.id}`, rateLimits.sensitive);
        if (!rateLimit.success) {
            return rateLimitResponse(rateLimit.resetTime);
        }

        const body = await request.json();
        const validation = enrollSchema.safeParse(body);
        
        if (!validation.success) {
            return NextResponse.json(
                { error: validation.error.issues[0].message },
                { status: 400 }
            );
        }
        
        const { courseId, paymentId } = validation.data;

        // Check if course exists
        const course = await db.query.courses.findFirst({
            where: eq(courses.id, courseId),
            with: { lessons: { columns: { id: true } } },
        });

        if (!course || course.status !== 'published') {
            return NextResponse.json({ error: "Course not found" }, { status: 404 });
        }

        // Check if already enrolled
        const existingEnrollment = await db.query.enrollments.findFirst({
            where: and(
                eq(enrollments.userId, session.user.id),
                eq(enrollments.courseId, courseId)
            ),
        });

        if (existingEnrollment) {
            return NextResponse.json(
                { error: "Already enrolled in this course" },
                { status: 400 }
            );
        }

        // Calculate effective price (use promo price if active)
        const originalPrice = parseFloat(course.price || '0');
        const now = new Date();
        const hasPromo = course.promoPrice !== null && course.promoPrice !== undefined;
        const promoStartOk = !course.promoStartsAt || new Date(course.promoStartsAt) <= now;
        const promoEndOk = !course.promoEndsAt || new Date(course.promoEndsAt) >= now;
        const isPromoActive = hasPromo && promoStartOk && promoEndOk;
        const coursePrice = isPromoActive ? parseFloat(course.promoPrice!.toString()) : originalPrice;

        const isPaidFulfillmentAttempt = coursePrice > 0 && Boolean(paymentId);
        if (!isPaidFulfillmentAttempt) {
            try {
                requireCourseHasLessons(course.lessons.length);
            } catch {
                return NextResponse.json({ error: COURSE_NOT_READY }, { status: 409 });
            }
        }

        // If course is paid, verify payment
        if (coursePrice > 0 && paymentId) {
            const payment = await db.query.payments.findFirst({
                where: and(
                    eq(payments.id, paymentId),
                    eq(payments.userId, session.user.id),
                    eq(payments.courseId, courseId),
                    eq(payments.status, "completed")
                ),
            });

            if (!payment) {
                return NextResponse.json(
                    { error: "Valid payment required" },
                    { status: 402 }
                );
            }
        } else if (coursePrice > 0) {
            return NextResponse.json(
                { error: "Payment required for this course" },
                { status: 402 }
            );
        }

        // Create enrollment (free course or paid with payment verification)
        const freeFulfillment = coursePrice <= 0
            ? await fulfillFreeEnrollment({ userId: session.user.id, courseIds: [courseId] })
            : null;
        const paidEnrollment = freeFulfillment
            ? null
            : await safeInsertEnrollment(session.user.id, courseId);
        const created = freeFulfillment
            ? freeFulfillment.created.length > 0
            : Boolean(paidEnrollment?.created);
        const enrollment = freeFulfillment?.created[0] ?? paidEnrollment?.enrollment;
        if (!created) {
            return NextResponse.json(
                { error: "Already enrolled in this course" },
                { status: 400 }
            );
        }

        // Send enrollment email (non-blocking)
        if (session.user.email && session.user.name) {
            sendEnrollmentEmail({
                email: session.user.email,
                name: session.user.name,
                courseName: course.title,
                courseSlug: course.slug,
            }).catch((err) => logError(err instanceof Error ? err : new Error(String(err)), { action: 'enroll.email_failed' }));
        }

        return NextResponse.json(enrollment, { status: 201 });
    } catch (error) {
        logError(error instanceof Error ? error : new Error(String(error)), { action: 'enroll.create_failed' });
        return NextResponse.json(
            { error: "Failed to enroll" },
            { status: 500 }
        );
    }
}

// GET /api/enroll?courseId=xxx - Check enrollment status
export async function GET(request: Request) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ enrolled: false });
        }

        const { searchParams } = new URL(request.url);
        const courseId = searchParams.get("courseId");

        if (!courseId) {
            return NextResponse.json(
                { error: "Course ID required" },
                { status: 400 }
            );
        }

        const enrollment = await db.query.enrollments.findFirst({
            where: and(
                eq(enrollments.userId, session.user.id),
                eq(enrollments.courseId, courseId)
            ),
        });

        return NextResponse.json({
            enrolled: !!enrollment,
            enrollment: enrollment || null,
        });
    } catch (error) {
        logError(error instanceof Error ? error : new Error(String(error)), { action: 'enroll.check_failed' });
        return NextResponse.json(
            { error: "Failed to check enrollment" },
            { status: 500 }
        );
    }
}

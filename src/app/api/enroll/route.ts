import { NextResponse } from "next/server";
import { logError } from '@/lib/error-handler';
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { enrollments, payments } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { sendEnrollmentEmail } from "@/lib/email";
import { z } from "zod";
import { checkRateLimit, rateLimits, rateLimitResponse } from "@/lib/rate-limit";
import { resolveCourseAcquisition } from "@/lib/course-acquisition";
import { safeInsertEnrollment } from "@/lib/db/safe-insert";
import { COURSE_NOT_READY } from "@/lib/course-availability";
import { fulfillFreeEnrollment } from '@/lib/free-enrollment-fulfillment';

// Validation schema
const enrollSchema = z.object({
    courseId: z.string().min(1, "Course ID is required"),
    paymentId: z.string().optional(),
    couponId: z.string().optional(),
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
        
        const { courseId, paymentId, couponId } = validation.data;

        const decision = await resolveCourseAcquisition({
            kind: 'enroll', userId: session.user.id, courseId, couponId, paymentId,
        });
        if (decision.kind === 'not_found') {
            return NextResponse.json({ error: "Course not found" }, { status: 404 });
        }
        if (decision.kind === 'owned') {
            return NextResponse.json({ error: "Already enrolled in this course" }, { status: 400 });
        }
        if (decision.kind === 'not_ready') {
            return NextResponse.json({ error: COURSE_NOT_READY }, { status: 409 });
        }
        if (decision.kind === 'coupon_not_found') {
            return NextResponse.json({ error: 'คูปองไม่ถูกต้อง' }, { status: 400 });
        }
        if (decision.kind === 'invalid_coupon') {
            return NextResponse.json({ error: decision.message }, { status: 400 });
        }
        const { course, coupon } = decision;

        if (decision.action === 'verify-payment') {
            if (!paymentId) return NextResponse.json({ error: "Valid payment required" }, { status: 402 });
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
        } else if (coupon) {
            if (decision.action !== 'enroll-free') {
                return NextResponse.json({ error: 'คูปองนี้ไม่ได้ลด 100% กรุณาชำระเงินส่วนที่เหลือ' }, { status: 402 });
            }
            const fulfillment = await fulfillFreeEnrollment({
                userId: session.user.id,
                courseIds: [courseId],
                coupon: {
                    id: coupon.id,
                    discountAmount: coupon.discountAmount,
                },
            });
            const createdEnrollment = fulfillment.created[0];
            if (!createdEnrollment) {
                return NextResponse.json({ error: 'Already enrolled in this course' }, { status: 400 });
            }

            const enrollment = { id: createdEnrollment.id, userId: session.user.id, courseId };

            // Send enrollment email (non-blocking)
            if (session.user.email && session.user.name) {
                sendEnrollmentEmail({
                    email: session.user.email,
                    name: session.user.name,
                    courseName: course.title,
                    courseSlug: course.slug,
                }).catch((err) => logError(err instanceof Error ? err : new Error(String(err)), { action: 'Failed to send enrollment email' }));
            }

            return NextResponse.json(enrollment, { status: 201 });
        } else if (decision.action === 'pay') {
            return NextResponse.json(
                { error: "Payment required for this course" },
                { status: 402 }
            );
        }

        // Create enrollment (free course or paid with payment verification)
        const freeFulfillment = decision.action === 'enroll-free'
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
            }).catch((err) => logError(err instanceof Error ? err : new Error(String(err)), { action: 'Failed to send enrollment email' }));
        }

        return NextResponse.json(enrollment, { status: 201 });
    } catch (error) {
        if (error instanceof Error && error.message === 'COUPON_LIMIT_EXCEEDED') {
            return NextResponse.json({ error: 'คูปองนี้ถูกใช้ครบจำนวนแล้ว' }, { status: 400 });
        }
        logError(error instanceof Error ? error : new Error(String(error)), { action: 'Error enrolling' });
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
        logError(error instanceof Error ? error : new Error(String(error)), { action: 'Error checking enrollment' });
        return NextResponse.json(
            { error: "Failed to check enrollment" },
            { status: 500 }
        );
    }
}

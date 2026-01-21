import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { enrollments, courses, payments } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { sendEnrollmentEmail } from "@/lib/email";

// POST /api/enroll - Enroll in a course
export async function POST(request: Request) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { courseId, paymentId } = await request.json();

        // Check if course exists
        const course = await db.query.courses.findFirst({
            where: eq(courses.id, courseId),
        });

        if (!course) {
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

        // If course is paid, verify payment
        if (course.price > 0 && paymentId) {
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
        } else if (course.price > 0) {
            return NextResponse.json(
                { error: "Payment required for this course" },
                { status: 402 }
            );
        }

        // Create enrollment
        const [enrollment] = await db
            .insert(enrollments)
            .values({
                userId: session.user.id,
                courseId,
            })
            .returning();

        // Send enrollment email
        if (session.user.email && session.user.name) {
            await sendEnrollmentEmail({
                email: session.user.email,
                name: session.user.name,
                courseName: course.title,
                courseSlug: course.slug,
            });
        }

        return NextResponse.json(enrollment, { status: 201 });
    } catch (error) {
        console.error("Error enrolling:", error);
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
        console.error("Error checking enrollment:", error);
        return NextResponse.json(
            { error: "Failed to check enrollment" },
            { status: 500 }
        );
    }
}

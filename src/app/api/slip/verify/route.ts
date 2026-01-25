import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { payments, enrollments, courses } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { sendPaymentConfirmation, sendEnrollmentEmail } from "@/lib/email";
import { createId } from "@paralleldrive/cuid2";
import { checkRateLimit, rateLimits, rateLimitResponse } from "@/lib/rate-limit";

// POST /api/slip/verify - Verify slip payment (PromptPay)
export async function POST(request: Request) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Rate limiting - 10 requests per minute per user
        const rateLimit = checkRateLimit(`slip:${session.user.id}`, rateLimits.sensitive);
        if (!rateLimit.success) {
            return rateLimitResponse(rateLimit.resetTime);
        }

        const formData = await request.formData();
        const slipFile = formData.get("slip") as File;
        const courseId = formData.get("courseId") as string;
        const amount = parseFloat(formData.get("amount") as string);

        if (!slipFile || !courseId || !amount) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        // Get course details
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

        // Create pending payment record first (MySQL doesn't support .returning())
        const paymentId = createId();
        await db.insert(payments).values({
            id: paymentId,
            userId: session.user.id,
            courseId,
            amount: String(amount),
            currency: "THB",
            method: "promptpay",
            status: "pending",
        } as typeof payments.$inferInsert);
        
        const payment = { id: paymentId, amount };

        // Verify slip with SlipOK API
        const slipFormData = new FormData();
        slipFormData.append("files", slipFile);
        slipFormData.append("amount", amount.toString());
        slipFormData.append("log", "true");

        const slipResponse = await fetch(
            `https://api.slipok.com/api/line/apikey/${process.env.SLIPOK_API_KEY}`,
            {
                method: "POST",
                headers: {
                    "x-authorization": process.env.SLIPOK_BRANCH_ID || "",
                },
                body: slipFormData,
            }
        );

        const slipResult = await slipResponse.json();

        if (slipResult.success && slipResult.data?.amount >= amount) {
            // Update payment to completed
            await db
                .update(payments)
                .set({
                    status: "completed",
                    slipUrl: slipResult.data?.transRef || null,
                })
                .where(eq(payments.id, payment.id));

            // Create enrollment
            await db.insert(enrollments).values({
                userId: session.user.id,
                courseId,
            });

            // Send confirmation emails (non-blocking)
            if (session.user.email && session.user.name) {
                Promise.all([
                    sendPaymentConfirmation({
                        email: session.user.email,
                        name: session.user.name,
                        courseName: course.title,
                        amount,
                        paymentId: payment.id,
                    }),
                    sendEnrollmentEmail({
                        email: session.user.email,
                        name: session.user.name,
                        courseName: course.title,
                        courseSlug: course.slug,
                    }),
                ]).catch((err) => console.error("Failed to send emails:", err));
            }

            return NextResponse.json({
                success: true,
                message: "Payment verified and enrolled successfully",
                paymentId: payment.id,
            });
        } else {
            // Update payment to failed
            await db
                .update(payments)
                .set({ status: "failed" })
                .where(eq(payments.id, payment.id));

            return NextResponse.json(
                {
                    success: false,
                    error: slipResult.message || "Slip verification failed",
                },
                { status: 400 }
            );
        }
    } catch (error) {
        console.error("Error verifying slip:", error);
        return NextResponse.json(
            { error: "Failed to verify slip" },
            { status: 500 }
        );
    }
}

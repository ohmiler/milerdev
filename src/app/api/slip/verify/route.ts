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

        const apiKey = (process.env.SLIPOK_API_KEY || "").trim();
        const branchId = (process.env.SLIPOK_BRANCH_ID || "").trim();

        console.log("[SlipOK] Sending request:", {
            url: `https://api.slipok.com/api/line/apikey/${branchId}`,
            apiKeyLength: apiKey.length,
            apiKeyPrefix: apiKey.substring(0, 4),
            branchIdLength: branchId.length,
            fileSize: slipFile.size,
            fileName: slipFile.name,
            amount,
        });

        const slipResponse = await fetch(
            `https://api.slipok.com/api/line/apikey/${branchId}`,
            {
                method: "POST",
                headers: {
                    "x-authorization": apiKey,
                },
                body: slipFormData,
            }
        );

        const slipResult = await slipResponse.json();
        console.log("[SlipOK] Response:", { status: slipResponse.status, result: slipResult });

        // Handle SlipOK error codes
        if (!slipResult.success) {
            await db
                .update(payments)
                .set({ status: "failed" })
                .where(eq(payments.id, payment.id));

            const errorMessages: Record<number, string> = {
                1001: "ไม่พบข้อมูลสลิป กรุณาตรวจสอบรูปภาพแล้วลองใหม่",
                1002: "เกิดข้อผิดพลาดในการยืนยันตัวตน กรุณาลองใหม่ภายหลัง",
                1003: "สลิปซ้ำ สลิปนี้เคยถูกใช้ไปแล้ว กรุณาใช้สลิปใหม่",
                1004: "ไม่สามารถอ่านข้อมูลจากสลิปได้ กรุณาถ่ายรูปให้ชัดเจน",
                1010: "สลิปยังไม่พร้อมตรวจสอบ กรุณารอสักครู่แล้วลองใหม่",
            };

            const code = slipResult.code || slipResult.data?.code;
            const errorMsg = errorMessages[code] || slipResult.message || "ไม่สามารถตรวจสอบสลิปได้ กรุณาลองใหม่";

            return NextResponse.json(
                { success: false, error: errorMsg },
                { status: 400 }
            );
        }

        // Check amount matches
        if (slipResult.data?.amount < amount) {
            await db
                .update(payments)
                .set({ status: "failed" })
                .where(eq(payments.id, payment.id));

            return NextResponse.json(
                {
                    success: false,
                    error: `ยอดเงินในสลิปไม่ตรง (สลิป: ฿${slipResult.data.amount.toLocaleString()} / ต้องชำระ: ฿${amount.toLocaleString()})`,
                },
                { status: 400 }
            );
        }

        // Success — update payment and create enrollment
        await db
            .update(payments)
            .set({
                status: "completed",
                slipUrl: slipResult.data?.transRef || null,
            })
            .where(eq(payments.id, payment.id));

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
    } catch (error) {
        console.error("Error verifying slip:", error);
        return NextResponse.json(
            { error: "Failed to verify slip" },
            { status: 500 }
        );
    }
}

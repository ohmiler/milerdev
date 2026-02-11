import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { payments, enrollments, bundles, bundleCourses, courses } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { sendPaymentConfirmation, sendEnrollmentEmail } from "@/lib/email";
import { createId } from "@paralleldrive/cuid2";
import { checkRateLimit, rateLimits, rateLimitResponse } from "@/lib/rate-limit";

// POST /api/bundles/slip/verify - Verify slip payment for bundle
export async function POST(request: Request) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Rate limiting
        const rateLimit = checkRateLimit(`slip:${session.user.id}`, rateLimits.sensitive);
        if (!rateLimit.success) {
            return rateLimitResponse(rateLimit.resetTime);
        }

        const formData = await request.formData();
        const slipFile = formData.get("slip") as File;
        const bundleId = formData.get("bundleId") as string;
        const amount = parseFloat(formData.get("amount") as string);

        if (!slipFile || !bundleId || !amount) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        // Get bundle details
        const [bundle] = await db
            .select()
            .from(bundles)
            .where(eq(bundles.id, bundleId))
            .limit(1);

        if (!bundle || bundle.status !== "published") {
            return NextResponse.json({ error: "Bundle not found" }, { status: 404 });
        }

        // Get courses in bundle
        const bCourses = await db
            .select({
                courseId: bundleCourses.courseId,
                courseTitle: courses.title,
                courseSlug: courses.slug,
            })
            .from(bundleCourses)
            .innerJoin(courses, eq(bundleCourses.courseId, courses.id))
            .where(eq(bundleCourses.bundleId, bundleId))
            .orderBy(asc(bundleCourses.orderIndex));

        if (bCourses.length === 0) {
            return NextResponse.json({ error: "Bundle has no courses" }, { status: 400 });
        }

        // Create pending payment record
        const paymentId = createId();
        await db.insert(payments).values({
            id: paymentId,
            userId: session.user.id,
            bundleId,
            amount: String(amount),
            currency: "THB",
            method: "promptpay",
            status: "pending",
        } as typeof payments.$inferInsert);

        // Verify slip with SlipOK API
        const slipFormData = new FormData();
        slipFormData.append("files", slipFile);
        slipFormData.append("amount", amount.toString());
        slipFormData.append("log", "true");

        const apiKey = (process.env.SLIPOK_API_KEY || "").trim();
        const branchId = (process.env.SLIPOK_BRANCH_ID || "").trim();

        console.log("[SlipOK Bundle] Sending request:", {
            url: `https://api.slipok.com/api/line/apikey/${branchId}`,
            bundleId,
            amount,
        });

        const slipResponse = await fetch(
            `https://api.slipok.com/api/line/apikey/${branchId}`,
            {
                method: "POST",
                headers: { "x-authorization": apiKey },
                body: slipFormData,
            }
        );

        const slipResult = await slipResponse.json();
        console.log("[SlipOK Bundle] Response:", { status: slipResponse.status, result: slipResult });

        // Handle SlipOK error
        if (!slipResult.success) {
            await db
                .update(payments)
                .set({ status: "failed" })
                .where(eq(payments.id, paymentId));

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
                .where(eq(payments.id, paymentId));

            return NextResponse.json(
                {
                    success: false,
                    error: `ยอดเงินในสลิปไม่ตรง (สลิป: ฿${slipResult.data.amount.toLocaleString()} / ต้องชำระ: ฿${amount.toLocaleString()})`,
                },
                { status: 400 }
            );
        }

        // Success — update payment
        await db
            .update(payments)
            .set({
                status: "completed",
                slipUrl: slipResult.data?.transRef || null,
            })
            .where(eq(payments.id, paymentId));

        // Enroll in all courses (skip if already enrolled)
        const enrolled: string[] = [];
        for (const course of bCourses) {
            const existingEnrollment = await db.query.enrollments.findFirst({
                where: and(
                    eq(enrollments.userId, session.user.id),
                    eq(enrollments.courseId, course.courseId)
                ),
            });

            if (!existingEnrollment) {
                await db.insert(enrollments).values({
                    id: createId(),
                    userId: session.user.id,
                    courseId: course.courseId,
                });
                enrolled.push(course.courseTitle);
            }
        }

        // Send confirmation emails (non-blocking)
        if (session.user.email && session.user.name) {
            Promise.all([
                sendPaymentConfirmation({
                    email: session.user.email,
                    name: session.user.name,
                    courseName: `${bundle.title} (Bundle)`,
                    amount,
                    paymentId,
                }),
                sendEnrollmentEmail({
                    email: session.user.email,
                    name: session.user.name,
                    courseName: `${bundle.title} (${enrolled.length} คอร์ส)`,
                    courseSlug: bCourses[0].courseSlug,
                }),
            ]).catch((err) => console.error("Failed to send bundle emails:", err));
        }

        return NextResponse.json({
            success: true,
            message: "ชำระเงินสำเร็จและลงทะเบียน Bundle เรียบร้อย",
            paymentId,
            enrolled,
        });
    } catch (error) {
        console.error("Error verifying bundle slip:", error);
        return NextResponse.json(
            { error: "Failed to verify slip" },
            { status: 500 }
        );
    }
}

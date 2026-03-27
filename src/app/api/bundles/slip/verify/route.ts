import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { payments, enrollments, bundles, bundleCourses, courses } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { sendPaymentConfirmation, sendEnrollmentEmail } from "@/lib/email";
import { createId } from "@paralleldrive/cuid2";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { checkRateLimit, getClientIP, rateLimits, rateLimitResponse } from "@/lib/rate-limit";

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

        if (!slipFile || !bundleId) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        // Server-side file validation
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(slipFile.type)) {
            return NextResponse.json(
                { error: "รองรับเฉพาะไฟล์ JPG, PNG, WEBP เท่านั้น" },
                { status: 400 }
            );
        }
        if (slipFile.size > 5 * 1024 * 1024) {
            return NextResponse.json(
                { error: "ไฟล์ต้องมีขนาดไม่เกิน 5MB" },
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

        // Calculate amount server-side
        const amount = parseFloat(bundle.price);
        if (amount <= 0) {
            return NextResponse.json({ error: "This bundle is free" }, { status: 400 });
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

        // Check if already enrolled in ALL courses of the bundle
        let alreadyEnrolledCount = 0;
        for (const bc of bCourses) {
            const existing = await db.query.enrollments.findFirst({
                where: and(
                    eq(enrollments.userId, session.user.id),
                    eq(enrollments.courseId, bc.courseId)
                ),
            });
            if (existing) alreadyEnrolledCount++;
        }
        if (alreadyEnrolledCount === bCourses.length) {
            return NextResponse.json(
                { error: "คุณลงทะเบียนคอร์สทั้งหมดใน Bundle นี้แล้ว" },
                { status: 400 }
            );
        }

        // Reuse existing pending payment or create new one
        const [existingPending] = await db
            .select()
            .from(payments)
            .where(
                and(
                    eq(payments.userId, session.user.id),
                    eq(payments.bundleId, bundleId),
                    eq(payments.status, 'pending'),
                    eq(payments.method, 'promptpay')
                )
            )
            .limit(1);

        let paymentId: string;
        if (existingPending) {
            paymentId = existingPending.id;
            await db.update(payments).set({
                amount: String(amount),
            }).where(eq(payments.id, existingPending.id));
        } else {
            paymentId = createId();
            await db.insert(payments).values({
                id: paymentId,
                userId: session.user.id,
                bundleId,
                amount: String(amount),
                currency: "THB",
                method: "promptpay",
                itemTitle: `📦 ${bundle.title}`,
                status: "pending",
            } as typeof payments.$inferInsert);
        }

        // Verify slip with SlipOK API
        const slipFormData = new FormData();
        slipFormData.append("files", slipFile);
        slipFormData.append("amount", amount.toString());
        slipFormData.append("log", "true");

        const apiKey = (process.env.SLIPOK_API_KEY || "").trim();
        const branchId = (process.env.SLIPOK_BRANCH_ID || "").trim();

        const slipController = new AbortController();
        const slipTimeout = setTimeout(() => slipController.abort(), 30_000);

        let slipResult;
        try {
            const slipResponse = await fetch(
                `https://api.slipok.com/api/line/apikey/${branchId}`,
                {
                    method: "POST",
                    headers: { "x-authorization": apiKey },
                    body: slipFormData,
                    signal: slipController.signal,
                }
            );
            slipResult = await slipResponse.json();
        } catch (fetchError) {
            const isTimeout = fetchError instanceof DOMException && fetchError.name === 'AbortError';
            await db.update(payments).set({
                status: isTimeout ? "verifying" : "failed",
            }).where(eq(payments.id, paymentId));
            return NextResponse.json(
                { success: false, error: isTimeout ? "การตรวจสอบสลิปใช้เวลานานเกินไป ระบบจะตรวจสอบให้อัตโนมัติ" : "ไม่สามารถเชื่อมต่อระบบตรวจสอบสลิปได้ กรุณาลองใหม่" },
                { status: 503 }
            );
        } finally {
            clearTimeout(slipTimeout);
        }

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

        // Success — update payment + enroll in a single transaction
        const enrolled: string[] = [];
        await db.transaction(async (tx) => {
            await tx
                .update(payments)
                .set({
                    status: "completed",
                    slipUrl: slipResult.data?.transRef || null,
                })
                .where(eq(payments.id, paymentId));

            for (const course of bCourses) {
                const existingEnrollment = await tx.query.enrollments.findFirst({
                    where: and(
                        eq(enrollments.userId, session.user.id),
                        eq(enrollments.courseId, course.courseId)
                    ),
                });

                if (!existingEnrollment) {
                    await tx.insert(enrollments).values({
                        id: createId(),
                        userId: session.user.id,
                        courseId: course.courseId,
                    });
                    enrolled.push(course.courseTitle);
                }
            }
        });

        await trackAnalyticsEvent({
            eventName: "payment_success",
            userId: session.user.id,
            bundleId,
            paymentId,
            source: "server",
            metadata: {
                itemType: "bundle",
                paymentMethod: "promptpay",
                amount,
            },
            ipAddress: getClientIP(request),
            userAgent: request.headers.get("user-agent") || "unknown",
        });

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


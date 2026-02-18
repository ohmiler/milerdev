import { NextResponse } from "next/server";
import { logError } from '@/lib/error-handler';
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { payments, enrollments, courses, coupons, couponUsages } from "@/lib/db/schema";
import { eq, and, sql, count } from "drizzle-orm";
import { sendPaymentConfirmation, sendEnrollmentEmail } from "@/lib/email";
import { createId } from "@paralleldrive/cuid2";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { checkRateLimit, getClientIP, rateLimits, rateLimitResponse } from "@/lib/rate-limit";
import { calculateDiscount, validateCouponEligibility } from "@/lib/coupon";

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
        const couponId = formData.get("couponId") as string | null;

        if (!slipFile || !courseId) {
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

        // Get course details
        const course = await db.query.courses.findFirst({
            where: eq(courses.id, courseId),
        });

        if (!course || course.status !== 'published') {
            return NextResponse.json({ error: "Course not found" }, { status: 404 });
        }

        // Calculate amount server-side (use promo price if active)
        const originalPrice = parseFloat(course.price || '0');
        const now = new Date();
        const hasPromo = course.promoPrice !== null && course.promoPrice !== undefined;
        const promoStartOk = !course.promoStartsAt || new Date(course.promoStartsAt) <= now;
        const promoEndOk = !course.promoEndsAt || new Date(course.promoEndsAt) >= now;
        const isPromoActive = hasPromo && promoStartOk && promoEndOk;
        let amount = isPromoActive ? parseFloat(course.promoPrice!.toString()) : originalPrice;

        // Apply coupon discount if provided
        let appliedCouponId: string | null = null;
        if (couponId) {
            const [coupon] = await db.select().from(coupons).where(eq(coupons.id, couponId)).limit(1);
            if (coupon) {
                const [userUsage] = await db.select({ count: count() }).from(couponUsages)
                    .where(and(eq(couponUsages.couponId, coupon.id), eq(couponUsages.userId, session.user.id)));

                const eligibility = validateCouponEligibility(coupon, {
                    targetCourseId: courseId,
                    userUsageCount: userUsage?.count || 0,
                    coursePrice: amount,
                });

                if (eligibility.valid) {
                    const discount = calculateDiscount(
                        amount,
                        coupon.discountType as 'percentage' | 'fixed',
                        coupon.discountValue,
                        coupon.maxDiscount,
                    );
                    amount = Math.max(0, amount - discount);
                    appliedCouponId = coupon.id;
                }
            }
        }

        if (amount <= 0) {
            return NextResponse.json({ error: "This course is free with coupon" }, { status: 400 });
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

        // Reuse existing pending payment or create new one
        const [existingPending] = await db
            .select()
            .from(payments)
            .where(
                and(
                    eq(payments.userId, session.user.id),
                    eq(payments.courseId, courseId),
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
                courseId,
                amount: String(amount),
                currency: "THB",
                method: "promptpay",
                itemTitle: course.title,
                status: "pending",
            } as typeof payments.$inferInsert);
        }
        
        const payment = { id: paymentId, amount };

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
                    headers: {
                        "x-authorization": apiKey,
                    },
                    body: slipFormData,
                    signal: slipController.signal,
                }
            );
            slipResult = await slipResponse.json();
        } catch (fetchError) {
            const isTimeout = fetchError instanceof DOMException && fetchError.name === 'AbortError';
            await db.update(payments).set({
                status: isTimeout ? "verifying" : "failed",
            }).where(eq(payments.id, payment.id));
            return NextResponse.json(
                { success: false, error: isTimeout ? "การตรวจสอบสลิปใช้เวลานานเกินไป ระบบจะตรวจสอบให้อัตโนมัติ" : "ไม่สามารถเชื่อมต่อระบบตรวจสอบสลิปได้ กรุณาลองใหม่" },
                { status: 503 }
            );
        } finally {
            clearTimeout(slipTimeout);
        }

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

        // Check amount matches — also reject if slipResult.data.amount is missing/undefined
        const slipAmount = slipResult.data?.amount;
        if (typeof slipAmount !== 'number' || slipAmount < amount) {
            await db
                .update(payments)
                .set({ status: "failed" })
                .where(eq(payments.id, payment.id));

            const slipAmountDisplay = typeof slipAmount === 'number' ? `฿${slipAmount.toLocaleString()}` : 'ไม่พบข้อมูล';
            return NextResponse.json(
                {
                    success: false,
                    error: `ยอดเงินในสลิปไม่ตรง (สลิป: ${slipAmountDisplay} / ต้องชำระ: ฿${amount.toLocaleString()})`,
                },
                { status: 400 }
            );
        }

        // Success — update payment, create enrollment, and record coupon in a single transaction
        await db.transaction(async (tx) => {
            await tx
                .update(payments)
                .set({
                    status: "completed",
                    slipUrl: slipResult.data?.transRef || null,
                })
                .where(eq(payments.id, payment.id));

            await tx.insert(enrollments).values({
                userId: session.user.id,
                courseId,
            });

            // Record coupon usage if coupon was applied
            // Conditional update guards against TOCTOU: only increments if still under limit
            if (appliedCouponId) {
                const couponUpdate = await tx.update(coupons)
                    .set({ usageCount: sql`${coupons.usageCount} + 1` })
                    .where(and(
                        eq(coupons.id, appliedCouponId),
                        sql`(${coupons.usageLimit} IS NULL OR ${coupons.usageCount} < ${coupons.usageLimit})`
                    ));
                if (couponUpdate[0].affectedRows === 0) {
                    throw new Error('COUPON_LIMIT_EXCEEDED');
                }
                await tx.insert(couponUsages).values({
                    couponId: appliedCouponId,
                    userId: session.user.id,
                    courseId,
                    discountAmount: String(isPromoActive
                        ? parseFloat(course.promoPrice!.toString()) - amount
                        : originalPrice - amount),
                });
            }
        });

        await trackAnalyticsEvent({
            eventName: "payment_success",
            userId: session.user.id,
            courseId,
            paymentId: payment.id,
            source: "server",
            metadata: {
                itemType: "course",
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
            ]).catch((err) => logError(err instanceof Error ? err : new Error(String(err)), { action: 'Failed to send emails' }));
        }

        return NextResponse.json({
            success: true,
            message: "Payment verified and enrolled successfully",
            paymentId: payment.id,
        });
    } catch (error) {
        if (error instanceof Error && error.message === 'COUPON_LIMIT_EXCEEDED') {
            return NextResponse.json({ error: 'คูปองนี้ถูกใช้ครบจำนวนแล้ว' }, { status: 400 });
        }
        logError(error instanceof Error ? error : new Error(String(error)), { action: 'Error verifying slip' });
        return NextResponse.json(
            { error: "Failed to verify slip" },
            { status: 500 }
        );
    }
}

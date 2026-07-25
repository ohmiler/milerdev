import { NextResponse } from 'next/server';

import { auth } from '@/lib/auth';
import { isDuplicateKeyError } from '@/lib/db/safe-insert';
import { sendEnrollmentEmail, sendPaymentConfirmation } from '@/lib/email';
import { logError } from '@/lib/error-handler';
import {
  claimPromptPayIntent,
  fulfillPromptPayIntent,
  releasePromptPayIntent,
} from '@/lib/promptpay-fulfillment';
import { PromptPayIntentError } from '@/lib/promptpay-intent';
import { checkRateLimit, rateLimits, rateLimitResponse } from '@/lib/rate-limit';

const allowedTypes = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);

export async function handlePromptPaySlip(
  request: Request,
  targetType: 'course' | 'bundle',
) {
  let claimedPaymentId: string | null = null;
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const rateLimit = checkRateLimit(`slip:${session.user.id}`, rateLimits.sensitive);
    if (!rateLimit.success) return rateLimitResponse(rateLimit.resetTime);

    const formData = await request.formData();
    const slipFile = formData.get('slip');
    const paymentId = formData.get('paymentId');
    if (!(slipFile instanceof File) || typeof paymentId !== 'string' || !paymentId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (!allowedTypes.has(slipFile.type)) {
      return NextResponse.json({ error: 'รองรับเฉพาะไฟล์ JPG, PNG, WEBP เท่านั้น' }, { status: 400 });
    }
    if (slipFile.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'ไฟล์ต้องมีขนาดไม่เกิน 5MB' }, { status: 400 });
    }

    const claim = await claimPromptPayIntent({
      paymentId,
      userId: session.user.id,
      targetType,
    });
    if (claim.status === 'already_fulfilled') {
      return NextResponse.json({ success: true, paymentId, alreadyFulfilled: true });
    }
    claimedPaymentId = paymentId;

    const providerForm = new FormData();
    providerForm.append('files', slipFile);
    providerForm.append('amount', claim.amount.toString());
    providerForm.append('log', 'true');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);
    let slipResult: {
      success?: boolean;
      code?: number;
      message?: string;
      data?: { code?: number; amount?: number; transRef?: string };
    };
    try {
      const response = await fetch(
        `https://api.slipok.com/api/line/apikey/${(process.env.SLIPOK_BRANCH_ID || '').trim()}`,
        {
          method: 'POST',
          headers: { 'x-authorization': (process.env.SLIPOK_API_KEY || '').trim() },
          body: providerForm,
          signal: controller.signal,
        },
      );
      slipResult = await response.json();
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        await releasePromptPayIntent(paymentId);
      }
      return NextResponse.json({
        success: false,
        error: error instanceof DOMException && error.name === 'AbortError'
          ? 'การตรวจสอบใช้เวลานานเกินไป ระบบจะเก็บรายการไว้เพื่อตรวจสอบ'
          : 'ไม่สามารถเชื่อมต่อระบบตรวจสอบสลิปได้ กรุณาลองใหม่',
      }, { status: 503 });
    } finally {
      clearTimeout(timeout);
    }

    const slipAmount = slipResult.data?.amount;
    const promptpayTransRef = slipResult.data?.transRef;
    if (!slipResult.success || typeof slipAmount !== 'number' || slipAmount < claim.amount || !promptpayTransRef) {
      await releasePromptPayIntent(paymentId);
      return NextResponse.json({
        success: false,
        error: slipResult.message || 'ไม่สามารถตรวจสอบสลิปได้ กรุณาลองใหม่',
      }, { status: 400 });
    }

    const fulfilled = await fulfillPromptPayIntent({
      paymentId,
      userId: session.user.id,
      promptpayTransRef,
    });
    claimedPaymentId = null;

    if (session.user.email && session.user.name && fulfilled.status === 'fulfilled' && fulfilled.emailDetails) {
      const details = fulfilled.emailDetails;
      Promise.all([
        sendPaymentConfirmation({
          email: session.user.email,
          name: session.user.name,
          courseName: details.courseCount ? `${details.title} (Bundle)` : details.title,
          amount: Number(fulfilled.payment.amount),
          paymentId,
        }),
        sendEnrollmentEmail({
          email: session.user.email,
          name: session.user.name,
          courseName: details.courseCount ? `${details.title} (${details.courseCount} คอร์ส)` : details.title,
          courseSlug: details.firstCourseSlug,
        }),
      ]).catch((error) => logError(
        error instanceof Error ? error : new Error(String(error)),
        { action: 'Failed to send PromptPay fulfillment email' },
      ));
    }

    return NextResponse.json({
      success: true,
      paymentId,
      enrolledCount: fulfilled.enrolledCount,
      alreadyFulfilled: fulfilled.status === 'already_fulfilled',
    });
  } catch (error) {
    if (claimedPaymentId && isDuplicateKeyError(error)) {
      await releasePromptPayIntent(claimedPaymentId);
      return NextResponse.json({ success: false, error: 'Duplicate slip reference' }, { status: 400 });
    }
    if (error instanceof PromptPayIntentError) {
      const status = error.code === 'PAYMENT_INTENT_EXPIRED' ? 410
        : error.code === 'PAYMENT_OWNER_MISMATCH' ? 404
          : 409;
      return NextResponse.json({ success: false, error: error.code }, { status });
    }
    logError(error instanceof Error ? error : new Error(String(error)), {
      action: `Error verifying ${targetType} PromptPay slip`,
    });
    return NextResponse.json({ error: 'Failed to verify slip' }, { status: 500 });
  }
}

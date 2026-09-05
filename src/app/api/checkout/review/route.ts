import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { loadOrderReview, OrderReviewError } from '@/lib/order-review';
import { checkRateLimit, rateLimits, rateLimitResponse } from '@/lib/rate-limit';

const reviewSchema = z.object({
  courseId: z.string().trim().min(1).max(36).optional(),
  bundleId: z.string().trim().min(1).max(36).optional(),
  couponCode: z.string().trim().min(1).max(100).optional(),
}).strict().refine((value) => Boolean(value.courseId) !== Boolean(value.bundleId))
  .refine((value) => !value.bundleId || !value.couponCode);

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
  const limit = checkRateLimit(`order-review:${session.user.id}`, rateLimits.sensitive);
  if (!limit.success) return rateLimitResponse(limit.resetTime);
  const parsed = reviewSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'ข้อมูลรายการไม่ถูกต้อง' }, { status: 400 });
  try {
    const review = await loadOrderReview(session.user.id, parsed.data);
    return NextResponse.json({ review }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof OrderReviewError ? error.message : 'ยังตรวจสอบรายการไม่ได้ กรุณาลองใหม่' }, {
      status: error instanceof OrderReviewError ? error.status : 500,
    });
  }
}

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { coupons, couponUsages } from '@/lib/db/schema';
import { eq, and, count } from 'drizzle-orm';

// POST /api/coupons/validate - Validate a coupon code
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { code, courseId, originalPrice } = await request.json();

    if (!code || !courseId || originalPrice === undefined) {
      return NextResponse.json({ error: 'กรุณาระบุรหัสคูปอง, คอร์ส, และราคา' }, { status: 400 });
    }

    const [coupon] = await db
      .select()
      .from(coupons)
      .where(eq(coupons.code, code.toUpperCase()))
      .limit(1);

    if (!coupon) {
      return NextResponse.json({ valid: false, error: 'ไม่พบคูปองนี้' }, { status: 400 });
    }

    // Check active
    if (!coupon.isActive) {
      return NextResponse.json({ valid: false, error: 'คูปองนี้ถูกปิดใช้งานแล้ว' }, { status: 400 });
    }

    // Check date range
    const now = new Date();
    if (coupon.startsAt && now < new Date(coupon.startsAt)) {
      return NextResponse.json({ valid: false, error: 'คูปองนี้ยังไม่เริ่มใช้งาน' }, { status: 400 });
    }
    if (coupon.expiresAt && now > new Date(coupon.expiresAt)) {
      return NextResponse.json({ valid: false, error: 'คูปองนี้หมดอายุแล้ว' }, { status: 400 });
    }

    // Check course restriction
    if (coupon.courseId && coupon.courseId !== courseId) {
      return NextResponse.json({ valid: false, error: 'คูปองนี้ไม่สามารถใช้กับคอร์สนี้ได้' }, { status: 400 });
    }

    // Check total usage limit
    if (coupon.usageLimit && (coupon.usageCount || 0) >= coupon.usageLimit) {
      return NextResponse.json({ valid: false, error: 'คูปองนี้ถูกใช้ครบจำนวนแล้ว' }, { status: 400 });
    }

    // Check per-user limit
    const [userUsage] = await db
      .select({ count: count() })
      .from(couponUsages)
      .where(and(
        eq(couponUsages.couponId, coupon.id),
        eq(couponUsages.userId, session.user.id)
      ));

    if (coupon.perUserLimit && (userUsage?.count || 0) >= coupon.perUserLimit) {
      return NextResponse.json({ valid: false, error: 'คุณใช้คูปองนี้ครบจำนวนแล้ว' }, { status: 400 });
    }

    // Check minimum purchase
    const price = parseFloat(originalPrice);
    const minPurchase = parseFloat(coupon.minPurchase || '0');
    if (price < minPurchase) {
      return NextResponse.json({
        valid: false,
        error: `คูปองนี้ใช้ได้กับราคาขั้นต่ำ ฿${minPurchase.toLocaleString()}`,
      }, { status: 400 });
    }

    // Calculate discount
    let discountAmount: number;
    if (coupon.discountType === 'percentage') {
      discountAmount = price * (parseFloat(coupon.discountValue) / 100);
      const maxDiscount = coupon.maxDiscount ? parseFloat(coupon.maxDiscount) : null;
      if (maxDiscount && discountAmount > maxDiscount) {
        discountAmount = maxDiscount;
      }
    } else {
      discountAmount = parseFloat(coupon.discountValue);
    }

    discountAmount = Math.min(discountAmount, price);
    discountAmount = Math.round(discountAmount * 100) / 100;
    const finalPrice = Math.max(0, price - discountAmount);

    return NextResponse.json({
      valid: true,
      couponId: coupon.id,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      discountAmount,
      finalPrice,
      description: coupon.description,
    });
  } catch (error) {
    console.error('Error validating coupon:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}

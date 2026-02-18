import { NextResponse } from 'next/server';
import { logError } from '@/lib/error-handler';
import { requireAdmin } from '@/lib/auth-helpers';
import { db } from '@/lib/db';
import { coupons, courses } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { logAudit } from '@/lib/auditLog';

// GET /api/admin/coupons - List all coupons
export async function GET() {
  try {
    const authResult = await requireAdmin();
    if (authResult instanceof NextResponse) return authResult;
    const { session } = authResult;

    const allCoupons = await db
      .select({
        id: coupons.id,
        code: coupons.code,
        description: coupons.description,
        discountType: coupons.discountType,
        discountValue: coupons.discountValue,
        minPurchase: coupons.minPurchase,
        maxDiscount: coupons.maxDiscount,
        usageLimit: coupons.usageLimit,
        usageCount: coupons.usageCount,
        perUserLimit: coupons.perUserLimit,
        courseId: coupons.courseId,
        courseTitle: courses.title,
        isActive: coupons.isActive,
        startsAt: coupons.startsAt,
        expiresAt: coupons.expiresAt,
        createdAt: coupons.createdAt,
      })
      .from(coupons)
      .leftJoin(courses, eq(coupons.courseId, courses.id))
      .orderBy(desc(coupons.createdAt));

    return NextResponse.json({ coupons: allCoupons });
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), { action: 'Error fetching coupons:' });
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}

// POST /api/admin/coupons - Create coupon
export async function POST(request: Request) {
  try {
    const authResult = await requireAdmin();
    if (authResult instanceof NextResponse) return authResult;
    const { session } = authResult;

    const body = await request.json();
    const {
      code, description, discountType, discountValue,
      minPurchase, maxDiscount, usageLimit, perUserLimit,
      courseId, startsAt, expiresAt,
    } = body;

    if (!code || !discountType || !discountValue) {
      return NextResponse.json({ error: 'กรุณาระบุรหัสคูปอง, ประเภทส่วนลด, และมูลค่าส่วนลด' }, { status: 400 });
    }

    // Check duplicate code
    const [existing] = await db.select({ id: coupons.id }).from(coupons).where(eq(coupons.code, code.toUpperCase())).limit(1);
    if (existing) {
      return NextResponse.json({ error: 'รหัสคูปองนี้มีอยู่แล้ว' }, { status: 400 });
    }

    const id = createId();
    await db.insert(coupons).values({
      id,
      code: code.toUpperCase(),
      description: description || null,
      discountType,
      discountValue: String(discountValue),
      minPurchase: minPurchase ? String(minPurchase) : '0',
      maxDiscount: maxDiscount ? String(maxDiscount) : null,
      usageLimit: usageLimit || null,
      perUserLimit: perUserLimit || 1,
      courseId: courseId || null,
      isActive: true,
      startsAt: startsAt ? new Date(startsAt) : null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    });

    await logAudit({ userId: session.user.id, action: 'create', entityType: 'coupon', entityId: id, newValue: code.toUpperCase() });

    return NextResponse.json({ message: 'สร้างคูปองสำเร็จ', couponId: id }, { status: 201 });
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), { action: 'Error creating coupon:' });
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { coupons } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { logAudit } from '@/lib/auditLog';

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/admin/coupons/[id]
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const [coupon] = await db.select().from(coupons).where(eq(coupons.id, id)).limit(1);
    if (!coupon) return NextResponse.json({ error: 'ไม่พบคูปอง' }, { status: 404 });

    return NextResponse.json({ coupon });
  } catch (error) {
    console.error('Error fetching coupon:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}

// PUT /api/admin/coupons/[id]
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const {
      code, description, discountType, discountValue,
      minPurchase, maxDiscount, usageLimit, perUserLimit,
      courseId, isActive, startsAt, expiresAt,
    } = body;

    const [existing] = await db.select().from(coupons).where(eq(coupons.id, id)).limit(1);
    if (!existing) return NextResponse.json({ error: 'ไม่พบคูปอง' }, { status: 404 });

    await db.update(coupons).set({
      code: code ? code.toUpperCase() : existing.code,
      description: description !== undefined ? description : existing.description,
      discountType: discountType || existing.discountType,
      discountValue: discountValue !== undefined ? String(discountValue) : existing.discountValue,
      minPurchase: minPurchase !== undefined ? String(minPurchase) : existing.minPurchase,
      maxDiscount: maxDiscount !== undefined ? (maxDiscount ? String(maxDiscount) : null) : existing.maxDiscount,
      usageLimit: usageLimit !== undefined ? usageLimit : existing.usageLimit,
      perUserLimit: perUserLimit !== undefined ? perUserLimit : existing.perUserLimit,
      courseId: courseId !== undefined ? (courseId || null) : existing.courseId,
      isActive: isActive !== undefined ? isActive : existing.isActive,
      startsAt: startsAt !== undefined ? (startsAt ? new Date(startsAt) : null) : existing.startsAt,
      expiresAt: expiresAt !== undefined ? (expiresAt ? new Date(expiresAt) : null) : existing.expiresAt,
    }).where(eq(coupons.id, id));

    await logAudit({ userId: session.user.id, action: 'update', entityType: 'coupon', entityId: id, newValue: code ? code.toUpperCase() : existing.code });

    return NextResponse.json({ message: 'อัพเดทคูปองสำเร็จ' });
  } catch (error) {
    console.error('Error updating coupon:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}

// DELETE /api/admin/coupons/[id]
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const [existing] = await db.select({ code: coupons.code }).from(coupons).where(eq(coupons.id, id)).limit(1);
    await db.delete(coupons).where(eq(coupons.id, id));

    await logAudit({ userId: session.user.id, action: 'delete', entityType: 'coupon', entityId: id, oldValue: existing?.code || id });

    return NextResponse.json({ message: 'ลบคูปองสำเร็จ' });
  } catch (error) {
    console.error('Error deleting coupon:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}

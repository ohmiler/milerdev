import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-helpers';
import { db } from '@/lib/db';
import { reviews } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { logAudit } from '@/lib/auditLog';

type RouteParams = { params: Promise<{ id: string }> };

// PUT /api/admin/reviews/[id] - Update review (toggle hidden, edit)
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const authResult = await requireAdmin();
    if (authResult instanceof NextResponse) return authResult;
    const { session } = authResult;

    const { id } = await params;
    const body = await request.json();

    const [existing] = await db
      .select()
      .from(reviews)
      .where(eq(reviews.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: 'ไม่พบรีวิว' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (typeof body.isHidden === 'boolean') updateData.isHidden = body.isHidden;
    if (typeof body.isVerified === 'boolean') updateData.isVerified = body.isVerified;
    if (body.comment !== undefined) updateData.comment = body.comment;
    if (body.rating !== undefined) updateData.rating = Math.min(5, Math.max(1, Math.round(body.rating)));
    if (body.displayName !== undefined) updateData.displayName = body.displayName;

    await db.update(reviews).set(updateData).where(eq(reviews.id, id));

    await logAudit({ userId: session.user.id, action: 'update', entityType: 'review', entityId: id });

    return NextResponse.json({ message: 'อัปเดตรีวิวสำเร็จ' });
  } catch (error) {
    console.error('Error updating review:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/admin/reviews/[id] - Delete review
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const authResult = await requireAdmin();
    if (authResult instanceof NextResponse) return authResult;
    const { session } = authResult;

    const { id } = await params;

    const [existing] = await db
      .select()
      .from(reviews)
      .where(eq(reviews.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: 'ไม่พบรีวิว' }, { status: 404 });
    }

    await db.delete(reviews).where(eq(reviews.id, id));

    await logAudit({ userId: session.user.id, action: 'delete', entityType: 'review', entityId: id });

    return NextResponse.json({ message: 'ลบรีวิวสำเร็จ' });
  } catch (error) {
    console.error('Error deleting review:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

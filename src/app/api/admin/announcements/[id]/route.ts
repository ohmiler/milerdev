import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-helpers';
import { db } from '@/lib/db';
import { announcements, notifications } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { logAudit } from '@/lib/auditLog';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/admin/announcements/[id] - Get single announcement
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const authResult = await requireAdmin();
    if (authResult instanceof NextResponse) return authResult;
    const { session } = authResult;

    const { id } = await params;

    const [announcement] = await db
      .select()
      .from(announcements)
      .where(eq(announcements.id, id))
      .limit(1);

    if (!announcement) {
      return NextResponse.json({ error: 'ไม่พบประกาศ' }, { status: 404 });
    }

    return NextResponse.json({ announcement });
  } catch (error) {
    console.error('Error fetching announcement:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/announcements/[id] - Update announcement
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const authResult = await requireAdmin();
    if (authResult instanceof NextResponse) return authResult;
    const { session } = authResult;

    const { id } = await params;
    const body = await request.json();
    const { title, content, type, targetRole, isActive, startsAt, endsAt } = body;

    // Check if announcement exists
    const [existing] = await db
      .select()
      .from(announcements)
      .where(eq(announcements.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: 'ไม่พบประกาศ' }, { status: 404 });
    }

    // Update announcement
    await db
      .update(announcements)
      .set({
        title: title || existing.title,
        content: content || existing.content,
        type: type || existing.type,
        targetRole: targetRole || existing.targetRole,
        isActive: isActive !== undefined ? isActive : existing.isActive,
        startsAt: startsAt !== undefined ? (startsAt ? new Date(startsAt) : null) : existing.startsAt,
        endsAt: endsAt !== undefined ? (endsAt ? new Date(endsAt) : null) : existing.endsAt,
        updatedAt: new Date(),
      })
      .where(eq(announcements.id, id));

    await logAudit({ userId: session.user.id, action: 'update', entityType: 'announcement', entityId: id, newValue: title || existing.title });

    return NextResponse.json({ message: 'อัพเดทประกาศสำเร็จ' });
  } catch (error) {
    console.error('Error updating announcement:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการอัพเดท' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/announcements/[id] - Delete announcement
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const authResult = await requireAdmin();
    if (authResult instanceof NextResponse) return authResult;
    const { session } = authResult;

    const { id } = await params;

    // Check if announcement exists
    const [existing] = await db
      .select()
      .from(announcements)
      .where(eq(announcements.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: 'ไม่พบประกาศ' }, { status: 404 });
    }

    // Delete related notifications (title pattern: 📢 {title}, link: /announcements)
    await db.delete(notifications).where(
      and(
        eq(notifications.title, `📢 ${existing.title}`),
        eq(notifications.link, '/announcements')
      )
    );

    // Delete announcement
    await db.delete(announcements).where(eq(announcements.id, id));

    await logAudit({ userId: session.user.id, action: 'delete', entityType: 'announcement', entityId: id, oldValue: existing.title });

    return NextResponse.json({ message: 'ลบประกาศสำเร็จ' });
  } catch (error) {
    console.error('Error deleting announcement:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการลบ' },
      { status: 500 }
    );
  }
}

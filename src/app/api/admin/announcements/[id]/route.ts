import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { announcements } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/admin/announcements/[id] - Get single announcement
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    // Delete announcement
    await db.delete(announcements).where(eq(announcements.id, id));

    return NextResponse.json({ message: 'ลบประกาศสำเร็จ' });
  } catch (error) {
    console.error('Error deleting announcement:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการลบ' },
      { status: 500 }
    );
  }
}

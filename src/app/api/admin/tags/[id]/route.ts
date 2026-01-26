import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { tags, courseTags } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PUT /api/admin/tags/[id] - Update tag
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name } = body;

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'กรุณาระบุชื่อแท็ก' }, { status: 400 });
    }

    // Check if tag exists
    const [existingTag] = await db
      .select()
      .from(tags)
      .where(eq(tags.id, id))
      .limit(1);

    if (!existingTag) {
      return NextResponse.json({ error: 'ไม่พบแท็ก' }, { status: 404 });
    }

    // Generate new slug
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^\u0E00-\u0E7Fa-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');

    // Update tag
    await db
      .update(tags)
      .set({ name: name.trim(), slug })
      .where(eq(tags.id, id));

    return NextResponse.json({ message: 'อัพเดทแท็กสำเร็จ' });
  } catch (error) {
    console.error('Error updating tag:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการอัพเดทแท็ก' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/tags/[id] - Delete tag
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Check if tag exists
    const [existingTag] = await db
      .select()
      .from(tags)
      .where(eq(tags.id, id))
      .limit(1);

    if (!existingTag) {
      return NextResponse.json({ error: 'ไม่พบแท็ก' }, { status: 404 });
    }

    // Delete course_tags relations first (cascade should handle this, but just in case)
    await db.delete(courseTags).where(eq(courseTags.tagId, id));

    // Delete tag
    await db.delete(tags).where(eq(tags.id, id));

    return NextResponse.json({ message: 'ลบแท็กสำเร็จ' });
  } catch (error) {
    console.error('Error deleting tag:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการลบแท็ก' },
      { status: 500 }
    );
  }
}

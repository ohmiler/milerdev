import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { tags } from '@/lib/db/schema';
import { eq, count, sql } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';

// GET /api/admin/tags - Get all tags
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get tags with course count
    const tagList = await db
      .select({
        id: tags.id,
        name: tags.name,
        slug: tags.slug,
        createdAt: tags.createdAt,
        courseCount: sql<number>`(SELECT COUNT(*) FROM course_tags WHERE tag_id = ${tags.id})`,
      })
      .from(tags)
      .orderBy(tags.name);

    return NextResponse.json({ tags: tagList });
  } catch (error) {
    console.error('Error fetching tags:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด' },
      { status: 500 }
    );
  }
}

// POST /api/admin/tags - Create new tag
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name } = body;

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'กรุณาระบุชื่อแท็ก' }, { status: 400 });
    }

    // Generate slug
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^\u0E00-\u0E7Fa-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');

    // Check if tag already exists
    const [existing] = await db
      .select()
      .from(tags)
      .where(eq(tags.slug, slug))
      .limit(1);

    if (existing) {
      return NextResponse.json({ error: 'แท็กนี้มีอยู่แล้ว' }, { status: 400 });
    }

    // Create tag
    const tagId = createId();
    await db.insert(tags).values({
      id: tagId,
      name: name.trim(),
      slug,
    });

    return NextResponse.json({
      message: 'สร้างแท็กสำเร็จ',
      tag: { id: tagId, name: name.trim(), slug },
    });
  } catch (error) {
    console.error('Error creating tag:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการสร้างแท็ก' },
      { status: 500 }
    );
  }
}

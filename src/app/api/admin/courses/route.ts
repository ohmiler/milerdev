import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { courses, courseTags } from '@/lib/db/schema';
import { createId } from '@paralleldrive/cuid2';

// POST /api/admin/courses - Create new course
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, price, status, thumbnailUrl, slug: customSlug, tagIds } = body;

    if (!title) {
      return NextResponse.json({ error: 'กรุณาระบุชื่อคอร์ส' }, { status: 400 });
    }

    // Use custom slug or generate from title
    const slug = (customSlug || title)
      .toLowerCase()
      .replace(/[^a-z0-9ก-๙\s-]+/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 100);

    const courseId = createId();

    await db.insert(courses).values({
      id: courseId,
      title,
      slug: slug || courseId,
      description: description || null,
      price: String(parseFloat(price) || 0),
      status: status || 'draft',
      thumbnailUrl: thumbnailUrl || null,
      instructorId: session.user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Save tags
    if (tagIds && Array.isArray(tagIds) && tagIds.length > 0) {
      await db.insert(courseTags).values(
        tagIds.map((tagId: string) => ({
          id: createId(),
          courseId,
          tagId,
        }))
      );
    }

    return NextResponse.json(
      { message: 'สร้างคอร์สสำเร็จ', courseId },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating course:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด กรุณาลองใหม่' },
      { status: 500 }
    );
  }
}

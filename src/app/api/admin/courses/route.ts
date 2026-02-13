import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { courses, courseTags } from '@/lib/db/schema';
import { createId } from '@paralleldrive/cuid2';
import { desc, eq } from 'drizzle-orm';
import { logAudit } from '@/lib/auditLog';
import { createCourseSchema, validateBody } from '@/lib/validations/admin';

// GET /api/admin/courses - List all courses
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const allCourses = await db
      .select({ id: courses.id, title: courses.title, slug: courses.slug, status: courses.status, price: courses.price })
      .from(courses)
      .orderBy(desc(courses.createdAt));

    return NextResponse.json({ courses: allCourses });
  } catch (error) {
    console.error('Error fetching courses:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}

// POST /api/admin/courses - Create new course
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = validateBody(createCourseSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    const { title, description, price, status, thumbnailUrl, slug: customSlug, tagIds, certificateColor } = validation.data;

    // Use custom slug or generate from title
    const slug = (customSlug || title)
      .toLowerCase()
      .replace(/[^a-z0-9ก-๙\s-]+/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 100);

    const finalSlug = slug || createId();

    // Check for duplicate slug
    const existingCourse = await db.select({ id: courses.id }).from(courses).where(eq(courses.slug, finalSlug)).limit(1);
    if (existingCourse.length > 0) {
      return NextResponse.json({ error: `Slug "${finalSlug}" ถูกใช้แล้ว กรุณาเปลี่ยน Slug` }, { status: 400 });
    }

    const courseId = createId();

    await db.insert(courses).values({
      id: courseId,
      title,
      slug: finalSlug,
      description: description || null,
      price: String(parseFloat(String(price ?? 0)) || 0),
      status: status || 'draft',
      thumbnailUrl: thumbnailUrl || null,
      certificateColor: certificateColor || '#2563eb',
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

    await logAudit({ userId: session.user.id, action: 'create', entityType: 'course', entityId: courseId, newValue: title });

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

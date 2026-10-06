import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { courseSections, lessons } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { logAudit } from '@/lib/auditLog';
import { createLessonInSection } from '@/lib/courses/course-structure-store';
import { revalidateCoursePagesById } from '@/lib/courses/revalidate';
import { sanitizeRichContent } from '@/lib/security/sanitize';
import { logError } from '@/lib/error-handler';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/admin/courses/[id]/lessons - Get all lessons for a course
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: courseId } = await params;

    const [courseLessons, sections] = await Promise.all([
      db
        .select()
        .from(lessons)
        .where(eq(lessons.courseId, courseId))
        .orderBy(asc(lessons.orderIndex), asc(lessons.id)),
      db
        .select({ id: courseSections.id, title: courseSections.title })
        .from(courseSections)
        .where(eq(courseSections.courseId, courseId))
        .orderBy(asc(courseSections.orderIndex), asc(courseSections.id)),
    ]);

    return NextResponse.json({ lessons: courseLessons, sections });
  } catch (error) {
    logError(error, { action: 'admin.courses.id.lessons.fetch_failed' });
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด' },
      { status: 500 }
    );
  }
}

// POST /api/admin/courses/[id]/lessons - Create new lesson
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: courseId } = await params;
    const body = await request.json();
    const { title, content, videoUrl, videoDuration, orderIndex, isFreePreview, sectionId } = body;

    if (!title) {
      return NextResponse.json({ error: 'กรุณาระบุชื่อบทเรียน' }, { status: 400 });
    }
    if (sectionId !== undefined && sectionId !== null && (typeof sectionId !== 'string' || sectionId.length > 36)) {
      return NextResponse.json({ error: 'หมวดไม่ถูกต้อง' }, { status: 400 });
    }

    const lessonId = createId();
    const safeContent = typeof content === 'string' ? sanitizeRichContent(content) : null;

    // The editor sends sectionId (an id or null) only for courses that already have sections.
    if (sectionId !== undefined) {
      const result = await createLessonInSection(courseId, sectionId, {
        id: lessonId,
        title,
        content: safeContent || null,
        videoUrl: videoUrl || null,
        videoDuration: parseInt(videoDuration) || 0,
        isFreePreview: isFreePreview || false,
        createdAt: new Date(),
      });
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: result.status });
      }
      await logAudit({ userId: session.user.id, action: 'create', entityType: 'lesson', entityId: lessonId, newValue: title });
      await revalidateCoursePagesById(courseId);
      return NextResponse.json({ message: 'สร้างบทเรียนสำเร็จ', lessonId }, { status: 201 });
    }

    // Get current max order index
    const existingLessons = await db
      .select({ orderIndex: lessons.orderIndex })
      .from(lessons)
      .where(eq(lessons.courseId, courseId))
      .orderBy(asc(lessons.orderIndex));

    const maxOrder = existingLessons.length > 0 
      ? Math.max(...existingLessons.map(l => l.orderIndex || 0)) + 1 
      : 0;

    await db.insert(lessons).values({
      id: lessonId,
      courseId,
      title,
      content: safeContent || null,
      videoUrl: videoUrl || null,
      videoDuration: parseInt(videoDuration) || 0,
      orderIndex: orderIndex !== undefined ? orderIndex : maxOrder,
      isFreePreview: isFreePreview || false,
      createdAt: new Date(),
    });

    await logAudit({ userId: session.user.id, action: 'create', entityType: 'lesson', entityId: lessonId, newValue: title });
    await revalidateCoursePagesById(courseId);

    return NextResponse.json(
      { message: 'สร้างบทเรียนสำเร็จ', lessonId },
      { status: 201 }
    );
  } catch (error) {
    logError(error, { action: 'admin.courses.id.lessons.create_failed' });
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด กรุณาลองใหม่' },
      { status: 500 }
    );
  }
}


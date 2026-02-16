import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { lessons } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { logAudit } from '@/lib/auditLog';
import { sanitizeRichContent } from '@/lib/sanitize';

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

    const courseLessons = await db
      .select()
      .from(lessons)
      .where(eq(lessons.courseId, courseId))
      .orderBy(asc(lessons.orderIndex));

    return NextResponse.json({ lessons: courseLessons });
  } catch (error) {
    console.error('Error fetching lessons:', error);
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
    const { title, content, videoUrl, videoDuration, orderIndex, isFreePreview } = body;

    if (!title) {
      return NextResponse.json({ error: 'กรุณาระบุชื่อบทเรียน' }, { status: 400 });
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

    const lessonId = createId();
    const safeContent = typeof content === 'string' ? sanitizeRichContent(content) : null;

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

    return NextResponse.json(
      { message: 'สร้างบทเรียนสำเร็จ', lessonId },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating lesson:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด กรุณาลองใหม่' },
      { status: 500 }
    );
  }
}

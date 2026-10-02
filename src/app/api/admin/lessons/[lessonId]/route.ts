import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { lessons } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { logAudit } from '@/lib/auditLog';
import { revalidateCoursePagesById } from '@/lib/courses/revalidate';
import { sanitizeRichContent } from '@/lib/security/sanitize';
import { logError } from '@/lib/error-handler';

interface RouteParams {
  params: Promise<{ lessonId: string }>;
}

// GET /api/admin/lessons/[lessonId] - Get single lesson
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { lessonId } = await params;

    const [lesson] = await db
      .select()
      .from(lessons)
      .where(eq(lessons.id, lessonId))
      .limit(1);

    if (!lesson) {
      return NextResponse.json({ error: 'ไม่พบบทเรียน' }, { status: 404 });
    }

    return NextResponse.json({ lesson });
  } catch (error) {
    logError(error, { action: 'admin.lessons.lesson_id.fetch_failed' });
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/lessons/[lessonId] - Update lesson
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { lessonId } = await params;
    const body = await request.json();
    const { title, content, videoUrl, videoDuration, orderIndex, isFreePreview } = body;

    // Check if lesson exists
    const [existingLesson] = await db
      .select()
      .from(lessons)
      .where(eq(lessons.id, lessonId))
      .limit(1);

    if (!existingLesson) {
      return NextResponse.json({ error: 'ไม่พบบทเรียน' }, { status: 404 });
    }

    const safeContent = content !== undefined
      ? (typeof content === 'string' ? sanitizeRichContent(content) : null)
      : existingLesson.content;

    // Update lesson
    await db
      .update(lessons)
      .set({
        title: title !== undefined ? title : existingLesson.title,
        content: safeContent,
        videoUrl: videoUrl !== undefined ? videoUrl : existingLesson.videoUrl,
        videoDuration: videoDuration !== undefined ? parseInt(videoDuration) : existingLesson.videoDuration,
        orderIndex: orderIndex !== undefined ? orderIndex : existingLesson.orderIndex,
        isFreePreview: isFreePreview !== undefined ? isFreePreview : existingLesson.isFreePreview,
      })
      .where(eq(lessons.id, lessonId));

    await logAudit({ userId: session.user.id, action: 'update', entityType: 'lesson', entityId: lessonId, newValue: title || existingLesson.title });
    await revalidateCoursePagesById(existingLesson.courseId);

    return NextResponse.json({ message: 'อัพเดทบทเรียนสำเร็จ' });
  } catch (error) {
    logError(error, { action: 'admin.lessons.lesson_id.update_failed' });
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด กรุณาลองใหม่' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/lessons/[lessonId] - Delete lesson
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { lessonId } = await params;

    // Check if lesson exists
    const [existingLesson] = await db
      .select()
      .from(lessons)
      .where(eq(lessons.id, lessonId))
      .limit(1);

    if (!existingLesson) {
      return NextResponse.json({ error: 'ไม่พบบทเรียน' }, { status: 404 });
    }

    // Delete lesson
    await db.delete(lessons).where(eq(lessons.id, lessonId));

    await logAudit({ userId: session.user.id, action: 'delete', entityType: 'lesson', entityId: lessonId, oldValue: existingLesson.title });
    await revalidateCoursePagesById(existingLesson.courseId);

    return NextResponse.json({ message: 'ลบบทเรียนสำเร็จ' });
  } catch (error) {
    logError(error, { action: 'admin.lessons.lesson_id.delete_failed' });
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด กรุณาลองใหม่' },
      { status: 500 }
    );
  }
}


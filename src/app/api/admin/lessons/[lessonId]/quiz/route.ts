import { NextResponse } from 'next/server';

import { logAudit } from '@/lib/auditLog';
import { requireAdmin } from '@/lib/auth/helpers';
import { logError } from '@/lib/error-handler';
import { lessonQuizInputSchema } from '@/lib/learning/lesson-quiz';
import { readLessonQuiz, replaceLessonQuiz } from '@/lib/learning/lesson-quiz-store';
import { validateBody } from '@/lib/validations/admin';

interface RouteParams {
  params: Promise<{ lessonId: string }>;
}

// GET /api/admin/lessons/[lessonId]/quiz - Questions with their answers, for editing
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const guard = await requireAdmin();
    if (guard instanceof NextResponse) return guard;

    const { lessonId } = await params;
    return NextResponse.json({ questions: await readLessonQuiz(lessonId) });
  } catch (error) {
    logError(error, { action: 'admin.lessons.quiz.fetch_failed' });
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}

// PUT /api/admin/lessons/[lessonId]/quiz - Replace the lesson's questions
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const guard = await requireAdmin();
    if (guard instanceof NextResponse) return guard;

    const { lessonId } = await params;
    const validation = validateBody(lessonQuizInputSchema, await request.json().catch(() => null));
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const result = await replaceLessonQuiz(lessonId, validation.data);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

    await logAudit({
      userId: guard.session.user.id,
      action: 'update',
      entityType: 'lesson_quiz',
      entityId: lessonId,
      newValue: `${validation.data.questions.length} questions`,
    });
    return NextResponse.json({ message: 'บันทึกแบบทดสอบสำเร็จ', questions: await readLessonQuiz(lessonId) });
  } catch (error) {
    logError(error, { action: 'admin.lessons.quiz.update_failed' });
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด กรุณาลองใหม่' }, { status: 500 });
  }
}

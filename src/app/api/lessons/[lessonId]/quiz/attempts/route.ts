import { NextResponse } from 'next/server';

import { auth } from '@/lib/auth';
import { logError } from '@/lib/error-handler';
import { quizAttemptInputSchema } from '@/lib/learning/lesson-quiz';
import { submitLessonQuizAttempt } from '@/lib/learning/lesson-quiz-store';
import { checkRateLimit, rateLimits, rateLimitResponse } from '@/lib/security/rate-limit';

interface RouteParams {
  params: Promise<{ lessonId: string }>;
}

// POST /api/lessons/[lessonId]/quiz/attempts - Grade a practice quiz and record the attempt
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rateLimit = checkRateLimit(`quiz-attempt:${session.user.id}`, rateLimits.api);
    if (!rateLimit.success) return rateLimitResponse(rateLimit.resetTime);

    const { lessonId } = await params;
    const parsed = quizAttemptInputSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success || lessonId.length > 36) {
      return NextResponse.json({ error: 'Invalid quiz answers' }, { status: 400 });
    }

    const result = await submitLessonQuizAttempt({
      userId: session.user.id,
      lessonId,
      answers: parsed.data.answers,
    });
    if (result.status === 'graded') {
      return NextResponse.json({ grade: result.grade });
    }
    if (result.status === 'forbidden') {
      return NextResponse.json({ error: 'Not enrolled in this course' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
  } catch (error) {
    logError(error, { action: 'learning.quiz_attempt_failed' });
    return NextResponse.json({ error: 'Failed to grade quiz' }, { status: 500 });
  }
}

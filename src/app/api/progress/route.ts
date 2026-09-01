import { and, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { lessonProgress, lessons } from '@/lib/db/schema';
import { logError } from '@/lib/error-handler';
import { updateLearningProgress } from '@/lib/learning-progress';
import { checkRateLimit, rateLimits, rateLimitResponse } from '@/lib/rate-limit';

const progressUpdateSchema = z.object({
  lessonId: z.string().trim().min(1).max(36),
  watchTimeSeconds: z.number().int().min(0).max(2_147_483_647).optional(),
  completed: z.boolean().optional(),
}).strict().refine(
  (value) => value.watchTimeSeconds !== undefined || value.completed !== undefined,
  'A progress value is required',
);

// POST /api/progress - Update lesson progress
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rateLimit = checkRateLimit(`progress:${session.user.id}`, rateLimits.general);
    if (!rateLimit.success) return rateLimitResponse(rateLimit.resetTime);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid progress update' }, { status: 400 });
    }
    const parsed = progressUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid progress update' }, { status: 400 });
    }

    const result = await updateLearningProgress({
      userId: session.user.id,
      ...parsed.data,
    });
    if (result.status === 'not_found') {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }
    if (result.status === 'forbidden') {
      return NextResponse.json({ error: 'Not enrolled in this course' }, { status: 403 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), {
      action: 'Error updating progress',
    });
    return NextResponse.json(
      { error: 'Failed to update progress' },
      { status: 500 },
    );
  }
}

// GET /api/progress?courseId=xxx - Get course progress
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId');
    if (!courseId) {
      return NextResponse.json({ error: 'Course ID required' }, { status: 400 });
    }

    const courseLessons = await db
      .select({ id: lessons.id })
      .from(lessons)
      .where(eq(lessons.courseId, courseId));
    const userProgress = await db
      .select({
        lessonId: lessonProgress.lessonId,
        completed: lessonProgress.completed,
        watchTimeSeconds: lessonProgress.watchTimeSeconds,
      })
      .from(lessonProgress)
      .innerJoin(lessons, eq(lessonProgress.lessonId, lessons.id))
      .where(and(
        eq(lessonProgress.userId, session.user.id),
        eq(lessons.courseId, courseId),
      ));
    const progressLookup = new Map(userProgress.map((progress) => [progress.lessonId, progress]));
    const progress = courseLessons.map((lesson) => ({
      lessonId: lesson.id,
      completed: progressLookup.get(lesson.id)?.completed || false,
      watchTimeSeconds: progressLookup.get(lesson.id)?.watchTimeSeconds || 0,
    }));

    return NextResponse.json({ progress });
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), {
      action: 'Error getting progress',
    });
    return NextResponse.json(
      { error: 'Failed to get progress' },
      { status: 500 },
    );
  }
}

import 'server-only';

import { createId } from '@paralleldrive/cuid2';
import { and, count, eq } from 'drizzle-orm';

import { ensureCompletedCertificate } from '@/lib/certificates/issuance';
import { db } from '@/lib/db';
import {
  enrollments,
  lessonProgress,
  lessons,
} from '@/lib/db/schema';
import { isDuplicateKeyError } from '@/lib/db/safe-insert';
import { logError, logEvent } from '@/lib/error-handler';

export type LearningProgressUpdate = {
  userId: string;
  lessonId: string;
  watchTimeSeconds?: number;
  completed?: boolean;
};

export type LearningProgressUpdateResult =
  | { status: 'not_found' | 'forbidden' }
  | {
    status: 'saved';
    courseCompleted: boolean;
    courseId: string;
    enrollmentId: string | null;
  };

export function derivePersistedLearningProgress(
  current: { completed: boolean; watchTimeSeconds: number },
  update: Pick<LearningProgressUpdate, 'completed' | 'watchTimeSeconds'>,
) {
  const completed = update.completed ?? current.completed;
  const watchTimeSeconds = update.watchTimeSeconds === undefined
    ? current.watchTimeSeconds
    : Math.max(current.watchTimeSeconds, update.watchTimeSeconds);

  return {
    completed,
    watchTimeSeconds,
    changed: completed !== current.completed || watchTimeSeconds !== current.watchTimeSeconds,
  };
}

export async function retryLearningProgressTransaction<T>(
  operation: () => Promise<T>,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error;
    return operation();
  }
}

export async function updateLearningProgress(
  input: LearningProgressUpdate,
): Promise<LearningProgressUpdateResult> {
  const result = await retryLearningProgressTransaction(() => (
    db.transaction(async (tx): Promise<LearningProgressUpdateResult> => {
    const [lesson] = await tx
      .select({
        id: lessons.id,
        courseId: lessons.courseId,
        isFreePreview: lessons.isFreePreview,
      })
      .from(lessons)
      .where(eq(lessons.id, input.lessonId))
      .limit(1);
    if (!lesson) return { status: 'not_found' };

    const [enrollment] = await tx
      .select({
        id: enrollments.id,
        completedAt: enrollments.completedAt,
      })
      .from(enrollments)
      .where(and(
        eq(enrollments.userId, input.userId),
        eq(enrollments.courseId, lesson.courseId),
      ))
      .limit(1)
      .for('update');
    if (!enrollment && !lesson.isFreePreview) return { status: 'forbidden' };

    const [existingProgress] = await tx
      .select({
        id: lessonProgress.id,
        completed: lessonProgress.completed,
        watchTimeSeconds: lessonProgress.watchTimeSeconds,
      })
      .from(lessonProgress)
      .where(and(
        eq(lessonProgress.userId, input.userId),
        eq(lessonProgress.lessonId, input.lessonId),
      ))
      .limit(1)
      .for('update');

    const progressId = existingProgress?.id ?? createId();
    const wasCompleted = existingProgress?.completed === true;
    const {
      completed: nextCompleted,
      watchTimeSeconds: nextWatchTimeSeconds,
      changed: progressChanged,
    } = derivePersistedLearningProgress({
      completed: existingProgress?.completed ?? false,
      watchTimeSeconds: Number(existingProgress?.watchTimeSeconds ?? 0),
    }, input);

    if (existingProgress) {
      if (progressChanged) {
        await tx.update(lessonProgress).set({
          watchTimeSeconds: nextWatchTimeSeconds,
          completed: nextCompleted,
          lastWatchedAt: new Date(),
        }).where(eq(lessonProgress.id, existingProgress.id));
      }
    } else {
      await tx.insert(lessonProgress).values({
        id: progressId,
        userId: input.userId,
        lessonId: input.lessonId,
        watchTimeSeconds: nextWatchTimeSeconds,
        completed: nextCompleted,
        lastWatchedAt: new Date(),
      });
    }

    if (!enrollment || wasCompleted === nextCompleted) {
      return {
        status: 'saved',
        courseCompleted: false,
        courseId: lesson.courseId,
        enrollmentId: enrollment?.id ?? null,
      };
    }

    const [[{ totalLessons }], [{ completedLessons }]] = await Promise.all([
      tx.select({ totalLessons: count() })
        .from(lessons)
        .where(eq(lessons.courseId, lesson.courseId)),
      // A locking read sees the latest committed rows. A plain read would use the snapshot
      // taken by the first query of this transaction, which predates the enrollment lock
      // above, so two lessons finishing at once would each miss the other and leave the
      // course below 100% with no certificate.
      tx.select({ completedLessons: count() })
        .from(lessonProgress)
        .innerJoin(lessons, eq(lessonProgress.lessonId, lessons.id))
        .where(and(
          eq(lessonProgress.userId, input.userId),
          eq(lessons.courseId, lesson.courseId),
          eq(lessonProgress.completed, true),
        ))
        .for('share'),
    ]);
    const progressPercent = totalLessons > 0
      ? Math.round((completedLessons / totalLessons) * 100)
      : 0;
    const courseCompleted = progressPercent === 100;

    await tx.update(enrollments).set({
      progressPercent,
      completedAt: courseCompleted ? enrollment.completedAt ?? new Date() : null,
    }).where(eq(enrollments.id, enrollment.id));

      return {
        status: 'saved',
        courseCompleted,
        courseId: lesson.courseId,
        enrollmentId: enrollment.id,
      };
    })
  ));

  if (result.status !== 'saved') return result;

  if (result.courseCompleted) {
    try {
      const certificate = await ensureCompletedCertificate(input.userId, result.courseId);
      if (certificate.kind === 'issued') logEvent('certificate.issued');
    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), {
        action: 'certificate.issue.failed',
      });
    }
  }

  return result;
}

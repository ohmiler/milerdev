import 'server-only';

import { createId } from '@paralleldrive/cuid2';
import { and, count, eq } from 'drizzle-orm';

import { ensureCompletedCertificate } from '@/lib/certificate';
import { db } from '@/lib/db';
import {
  enrollments,
  lessonProgress,
  lessons,
  measurementOutbox,
} from '@/lib/db/schema';
import { isDuplicateKeyError } from '@/lib/db/safe-insert';
import { logError, logEvent } from '@/lib/error-handler';
import {
  learningMeasurementProjector,
  type LearningMilestoneIdentity,
} from '@/lib/learning-measurement';

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
    milestones: LearningMilestoneIdentity[];
    courseCompleted: boolean;
    courseId: string;
    enrollmentId: string | null;
  };

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

export function deriveLearningMilestoneIdentities(input: {
  progressId: string;
  enrollmentId: string;
  lessonCompletedBefore: boolean;
  lessonCompletedAfter: boolean;
  courseCompletedBefore: boolean;
  courseCompletedAfter: boolean;
}): LearningMilestoneIdentity[] {
  const milestones: LearningMilestoneIdentity[] = [];
  if (!input.lessonCompletedBefore && input.lessonCompletedAfter) {
    milestones.push({ eventName: 'lesson_completed', factId: input.progressId });
  }
  if (!input.courseCompletedBefore && input.courseCompletedAfter) {
    milestones.push({ eventName: 'course_completed', factId: input.enrollmentId });
  }
  return milestones;
}

type DatabaseTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function enqueueLearningMilestone(
  tx: DatabaseTransaction,
  input: LearningMilestoneIdentity & {
    enrollmentId: string;
    courseId: string;
    lessonId: string | null;
  },
) {
  try {
    await tx.insert(measurementOutbox).values({
      eventName: input.eventName,
      paymentId: null,
      enrollmentId: null,
      learningFactId: input.factId,
      learningEnrollmentId: input.enrollmentId,
      courseId: input.courseId,
      lessonId: input.lessonId,
    });
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error;
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
    const nextCompleted = input.completed ?? existingProgress?.completed ?? false;
    const currentWatchTimeSeconds = Number(existingProgress?.watchTimeSeconds ?? 0);
    const nextWatchTimeSeconds = input.watchTimeSeconds === undefined
      ? currentWatchTimeSeconds
      : Math.max(currentWatchTimeSeconds, input.watchTimeSeconds);
    const progressChanged = nextWatchTimeSeconds !== currentWatchTimeSeconds
      || nextCompleted !== (existingProgress?.completed ?? false);

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
        milestones: [],
        courseCompleted: false,
        courseId: lesson.courseId,
        enrollmentId: enrollment?.id ?? null,
      };
    }

    const [[{ totalLessons }], [{ completedLessons }]] = await Promise.all([
      tx.select({ totalLessons: count() })
        .from(lessons)
        .where(eq(lessons.courseId, lesson.courseId)),
      tx.select({ completedLessons: count() })
        .from(lessonProgress)
        .innerJoin(lessons, eq(lessonProgress.lessonId, lessons.id))
        .where(and(
          eq(lessonProgress.userId, input.userId),
          eq(lessons.courseId, lesson.courseId),
          eq(lessonProgress.completed, true),
        )),
    ]);
    const progressPercent = totalLessons > 0
      ? Math.round((completedLessons / totalLessons) * 100)
      : 0;
    const courseCompleted = progressPercent === 100;
    const courseCompletedBefore = Boolean(enrollment.completedAt);

    await tx.update(enrollments).set({
      progressPercent,
      completedAt: courseCompleted ? enrollment.completedAt ?? new Date() : null,
    }).where(eq(enrollments.id, enrollment.id));

    const milestones = deriveLearningMilestoneIdentities({
      progressId,
      enrollmentId: enrollment.id,
      lessonCompletedBefore: wasCompleted,
      lessonCompletedAfter: nextCompleted,
      courseCompletedBefore,
      courseCompletedAfter: courseCompleted,
    });
    for (const milestone of milestones) {
      await enqueueLearningMilestone(tx, {
        ...milestone,
        enrollmentId: enrollment.id,
        courseId: lesson.courseId,
        lessonId: milestone.eventName === 'lesson_completed' ? lesson.id : null,
      });
    }

      return {
        status: 'saved',
        milestones,
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

  if (result.enrollmentId) {
    await learningMeasurementProjector.projectPendingMilestones(result.enrollmentId);
  }
  return result;
}

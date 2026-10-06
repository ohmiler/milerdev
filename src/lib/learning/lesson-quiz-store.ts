import 'server-only';

import { createId } from '@paralleldrive/cuid2';
import { and, asc, desc, eq, inArray } from 'drizzle-orm';

import { db } from '@/lib/db';
import { enrollments, lessonQuizAttempts, lessonQuizQuestions, lessons } from '@/lib/db/schema';
import {
  gradeQuiz,
  toLearnerQuestion,
  type LearnerQuiz,
  type LessonQuizInput,
  type QuizAttemptSummary,
  type QuizGrade,
  type QuizQuestion,
} from './lesson-quiz';

export type QuizSubmission =
  | { status: 'not_found' | 'forbidden' | 'no_quiz' }
  | { status: 'graded'; grade: QuizGrade };

/** The full questions, answers included. Admin and grading use only. */
export async function readLessonQuiz(lessonId: string): Promise<QuizQuestion[]> {
  const rows = await db
    .select({
      id: lessonQuizQuestions.id,
      prompt: lessonQuizQuestions.prompt,
      options: lessonQuizQuestions.options,
      explanation: lessonQuizQuestions.explanation,
    })
    .from(lessonQuizQuestions)
    .where(eq(lessonQuizQuestions.lessonId, lessonId))
    .orderBy(asc(lessonQuizQuestions.orderIndex), asc(lessonQuizQuestions.id));
  return rows.map((row) => ({ ...row, options: Array.isArray(row.options) ? row.options : [] }));
}

/**
 * The quiz as a learner may see it before answering: no isCorrect, no explanations.
 * Callers must already have authorized the lesson (enrolled or free preview).
 */
export async function readLearnerQuiz(memberId: string | null, lessonId: string): Promise<LearnerQuiz | null> {
  const questions = await readLessonQuiz(lessonId);
  if (questions.length === 0) return null;
  let lastAttempt: QuizAttemptSummary | null = null;
  if (memberId) {
    const [attempt] = await db
      .select({ score: lessonQuizAttempts.score, total: lessonQuizAttempts.total, submittedAt: lessonQuizAttempts.submittedAt })
      .from(lessonQuizAttempts)
      .where(and(eq(lessonQuizAttempts.userId, memberId), eq(lessonQuizAttempts.lessonId, lessonId)))
      .orderBy(desc(lessonQuizAttempts.submittedAt), desc(lessonQuizAttempts.id))
      .limit(1);
    if (attempt) lastAttempt = { ...attempt, submittedAt: attempt.submittedAt.toISOString() };
  }
  return { questions: questions.map(toLearnerQuestion), lastAttempt };
}

/** Grades and records a submission. Same access rule as the lesson: enrolled, or a free preview. */
export async function submitLessonQuizAttempt(input: {
  userId: string;
  lessonId: string;
  answers: Record<string, string>;
}): Promise<QuizSubmission> {
  const [lesson] = await db
    .select({ courseId: lessons.courseId, isFreePreview: lessons.isFreePreview })
    .from(lessons)
    .where(eq(lessons.id, input.lessonId))
    .limit(1);
  if (!lesson) return { status: 'not_found' };

  if (!lesson.isFreePreview) {
    const [enrollment] = await db
      .select({ id: enrollments.id })
      .from(enrollments)
      .where(and(eq(enrollments.userId, input.userId), eq(enrollments.courseId, lesson.courseId)))
      .limit(1);
    if (!enrollment) return { status: 'forbidden' };
  }

  const questions = await readLessonQuiz(input.lessonId);
  if (questions.length === 0) return { status: 'no_quiz' };

  const grade = gradeQuiz(questions, input.answers);
  const answers = Object.fromEntries(
    grade.results.flatMap((result) => (result.chosenOptionId ? [[result.questionId, result.chosenOptionId]] : [])),
  );
  await db.insert(lessonQuizAttempts).values({
    id: createId(),
    userId: input.userId,
    lessonId: input.lessonId,
    score: grade.score,
    total: grade.total,
    answers,
    submittedAt: new Date(),
  });
  return { status: 'graded', grade };
}

/**
 * Replaces a lesson's questions with the edited set. Questions and options keep their ids
 * so earlier attempts still point at the same questions; ids from elsewhere are not trusted.
 */
export function replaceLessonQuiz(
  lessonId: string,
  input: LessonQuizInput,
): Promise<{ ok: true } | { ok: false; status: 404; error: string }> {
  return db.transaction(async (tx) => {
    const [lesson] = await tx.select({ id: lessons.id }).from(lessons).where(eq(lessons.id, lessonId)).limit(1).for('update');
    if (!lesson) return { ok: false as const, status: 404 as const, error: 'ไม่พบบทเรียน' };

    const existing = await tx
      .select({ id: lessonQuizQuestions.id, options: lessonQuizQuestions.options })
      .from(lessonQuizQuestions)
      .where(eq(lessonQuizQuestions.lessonId, lessonId));
    const existingById = new Map(existing.map((row) => [row.id, row]));
    const kept = new Set<string>();
    const now = new Date();

    for (const [index, question] of input.questions.entries()) {
      const current = question.id ? existingById.get(question.id) : undefined;
      const knownOptionIds = new Set((Array.isArray(current?.options) ? current.options : []).map((option) => option.id));
      const usedOptionIds = new Set<string>();
      const options = question.options.map((option) => {
        const id = option.id && knownOptionIds.has(option.id) && !usedOptionIds.has(option.id) ? option.id : createId();
        usedOptionIds.add(id);
        return { id, text: option.text, isCorrect: option.isCorrect };
      });
      const values = {
        prompt: question.prompt,
        options,
        explanation: question.explanation?.trim() || null,
        orderIndex: (index + 1) * 100,
        updatedAt: now,
      };
      if (current && !kept.has(current.id)) {
        kept.add(current.id);
        await tx.update(lessonQuizQuestions).set(values).where(eq(lessonQuizQuestions.id, current.id));
      } else {
        await tx.insert(lessonQuizQuestions).values({ id: createId(), lessonId, createdAt: now, ...values });
      }
    }

    const removed = existing.map((row) => row.id).filter((id) => !kept.has(id));
    if (removed.length > 0) {
      await tx.delete(lessonQuizQuestions).where(inArray(lessonQuizQuestions.id, removed));
    }
    return { ok: true as const };
  });
}

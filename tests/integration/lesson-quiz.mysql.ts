import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomBytes } from 'node:crypto';
import { asc, eq, inArray, sql } from 'drizzle-orm';
import { courses, enrollments, lessonQuizAttempts, lessonQuizQuestions, lessons, users } from '@/lib/db/schema';

/**
 * Lesson quizzes on real MySQL: grading uses only stored answers, a learner's view never
 * carries them, submissions follow the lesson's access rule, and editing keeps question ids.
 */

let db: typeof import('@/lib/db').db;
let store: typeof import('@/lib/learning/lesson-quiz-store');
const suffix = randomBytes(6).toString('hex');
let counter = 0;
const created = { users: [] as string[], courses: [] as string[] };
const id = (kind: string) => `lq-${suffix}-${kind}-${counter++}`;

const quiz = {
  questions: [
    { prompt: 'ข้อหนึ่ง', options: [{ text: 'ถูก', isCorrect: true }, { text: 'ผิด', isCorrect: false }], explanation: 'เพราะถูก' },
    { prompt: 'ข้อสอง', options: [{ text: 'ผิด', isCorrect: false }, { text: 'ถูก', isCorrect: true }], explanation: null },
  ],
};

async function seed(opts: { enrolled?: boolean; freePreview?: boolean } = {}) {
  const userId = id('u');
  const courseId = id('c');
  const lessonId = id('l');
  await db.insert(users).values({ id: userId, email: `${userId}@example.test` });
  await db.insert(courses).values({ id: courseId, title: 'Quiz', slug: `quiz-${courseId}`, price: '100', status: 'published' });
  await db.insert(lessons).values({ id: lessonId, courseId, title: 'Lesson', orderIndex: 100, isFreePreview: opts.freePreview ?? false });
  created.users.push(userId);
  created.courses.push(courseId);
  if (opts.enrolled) await db.insert(enrollments).values({ userId, courseId });
  expect(await store.replaceLessonQuiz(lessonId, quiz)).toEqual({ ok: true });
  const questions = await store.readLessonQuiz(lessonId);
  const correct = (index: number) => questions[index].options.find((option) => option.isCorrect)!.id;
  const wrong = (index: number) => questions[index].options.find((option) => !option.isCorrect)!.id;
  return { userId, courseId, lessonId, questions, correct, wrong };
}

const attemptsOf = (userId: string) => db.select().from(lessonQuizAttempts).where(eq(lessonQuizAttempts.userId, userId));

beforeAll(async () => {
  // Deliberately refuse owner databases and non-loopback connections.
  const target = new URL(process.env.DATABASE_URL ?? 'invalid');
  if (target.protocol !== 'mysql:' || target.hostname !== '127.0.0.1' || target.pathname !== '/milerdev_e2e') {
    throw new Error('Lesson quiz integration tests require the dedicated loopback milerdev_e2e database');
  }
  ({ db } = await import('@/lib/db'));
  store = await import('@/lib/learning/lesson-quiz-store');
  await db.execute(sql`SELECT 1`);
});

afterAll(async () => {
  if (!db) return;
  // Only rows created here are removed; courses cascade to lessons, questions and attempts.
  if (created.users.length) await db.delete(enrollments).where(inArray(enrollments.userId, created.users));
  if (created.courses.length) await db.delete(courses).where(inArray(courses.id, created.courses));
  if (created.users.length) await db.delete(users).where(inArray(users.id, created.users));
  await db.$client.end();
});

describe('lesson quiz on real MySQL', () => {
  it('grades an enrolled learner against stored answers and records only real choices', async () => {
    const s = await seed({ enrolled: true });

    const result = await store.submitLessonQuizAttempt({
      userId: s.userId,
      lessonId: s.lessonId,
      answers: { [s.questions[0].id]: s.correct(0), [s.questions[1].id]: s.wrong(1), 'not-a-question': 'x' },
    });

    expect(result).toMatchObject({ status: 'graded', grade: { score: 1, total: 2 } });
    const [attempt] = await attemptsOf(s.userId);
    expect(attempt).toMatchObject({ lessonId: s.lessonId, score: 1, total: 2 });
    expect(attempt.answers).toEqual({ [s.questions[0].id]: s.correct(0), [s.questions[1].id]: s.wrong(1) });
  });

  it('refuses a member without enrollment on a paid lesson and stores nothing', async () => {
    const s = await seed({ enrolled: false });

    expect(await store.submitLessonQuizAttempt({ userId: s.userId, lessonId: s.lessonId, answers: {} }))
      .toEqual({ status: 'forbidden' });
    expect(await attemptsOf(s.userId)).toEqual([]);
  });

  it('lets any signed-in member practise on a free-preview lesson', async () => {
    const s = await seed({ enrolled: false, freePreview: true });

    const result = await store.submitLessonQuizAttempt({ userId: s.userId, lessonId: s.lessonId, answers: { [s.questions[0].id]: s.correct(0) } });

    expect(result).toMatchObject({ status: 'graded', grade: { score: 1, total: 2 } });
  });

  it('shows learners the questions without answers or explanations, plus their latest score', async () => {
    const s = await seed({ enrolled: true });
    await store.submitLessonQuizAttempt({ userId: s.userId, lessonId: s.lessonId, answers: {} });

    const learner = await store.readLearnerQuiz(s.userId, s.lessonId);

    expect(learner?.questions.map((question) => question.prompt)).toEqual(['ข้อหนึ่ง', 'ข้อสอง']);
    expect(JSON.stringify(learner)).not.toMatch(/isCorrect|เพราะถูก/);
    expect(learner?.lastAttempt).toMatchObject({ score: 0, total: 2 });
    expect(await store.readLearnerQuiz(null, s.lessonId)).toMatchObject({ lastAttempt: null });
  });

  it('keeps question and option ids across edits, deletes removed questions and ignores foreign ids', async () => {
    const s = await seed({ enrolled: true });
    const other = await seed({ enrolled: true });
    const [first, second] = s.questions;

    const result = await store.replaceLessonQuiz(s.lessonId, {
      questions: [
        { id: second.id, prompt: 'ข้อสอง (แก้)', options: second.options.map((option) => ({ ...option })), explanation: null },
        { id: other.questions[0].id, prompt: 'ใหม่', options: [{ id: first.options[0].id, text: 'ก', isCorrect: true }, { text: 'ข', isCorrect: false }] },
      ],
    });

    expect(result).toEqual({ ok: true });
    const after = await db.select().from(lessonQuizQuestions)
      .where(eq(lessonQuizQuestions.lessonId, s.lessonId)).orderBy(asc(lessonQuizQuestions.orderIndex));
    expect(after.map((question) => question.prompt)).toEqual(['ข้อสอง (แก้)', 'ใหม่']);
    expect(after[0].id).toBe(second.id);
    expect(after[0].options.map((option) => option.id)).toEqual(second.options.map((option) => option.id));
    // An id from another lesson is never adopted; it becomes a new question with new option ids.
    expect(after[1].id).not.toBe(other.questions[0].id);
    expect(after[1].options[0].id).not.toBe(first.options[0].id);
    expect(after.some((question) => question.id === first.id)).toBe(false);
    expect((await store.readLessonQuiz(other.lessonId)).map((question) => question.id)).toEqual(other.questions.map((question) => question.id));
  });

  it('reports a missing lesson instead of creating orphan questions', async () => {
    expect(await store.replaceLessonQuiz(id('missing'), quiz)).toMatchObject({ ok: false, status: 404 });
  });
});

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomBytes } from 'node:crypto';
import { inArray, sql } from 'drizzle-orm';
import { courses, enrollments, lessonProgress, lessons, users } from '@/lib/db/schema';

/**
 * The course page's progress on real MySQL: it reads the member's own enrollment in that one course,
 * and another course's lessons or progress never leak into it.
 */

let db: typeof import('@/lib/db').db;
let learning: typeof import('@/lib/learning/dashboard');
const suffix = randomBytes(6).toString('hex');
let counter = 0;
const created = { users: [] as string[], courses: [] as string[] };
const id = (kind: string) => `cl-${suffix}-${kind}-${counter++}`;

async function courseWithLessons(titles: string[]) {
  const courseId = id('c');
  await db.insert(courses).values({ id: courseId, title: `Course ${courseId}`, slug: `course-learning-${courseId}`, price: '100', status: 'published' });
  created.courses.push(courseId);
  const lessonIds = titles.map(() => id('l'));
  await db.insert(lessons).values(lessonIds.map((lessonId, index) => ({ id: lessonId, courseId, title: titles[index], orderIndex: index + 1 })));
  return { courseId, lessonIds };
}

async function member() {
  const userId = id('u');
  await db.insert(users).values({ id: userId, email: `${userId}@example.test`, name: 'ผู้เรียนทดสอบ' });
  created.users.push(userId);
  return userId;
}

beforeAll(async () => {
  // Deliberately refuse owner databases and non-loopback connections.
  const target = new URL(process.env.DATABASE_URL ?? 'invalid');
  if (target.protocol !== 'mysql:' || target.hostname !== '127.0.0.1' || target.pathname !== '/milerdev_e2e') {
    throw new Error('Course learning integration tests require the dedicated loopback milerdev_e2e database');
  }
  ({ db } = await import('@/lib/db'));
  learning = await import('@/lib/learning/dashboard');
  await db.execute(sql`SELECT 1`);
});

afterAll(async () => {
  if (!db) return;
  // Only rows created here are removed; courses cascade to lessons, users to enrollments and progress.
  if (created.courses.length) await db.delete(courses).where(inArray(courses.id, created.courses));
  if (created.users.length) await db.delete(users).where(inArray(users.id, created.users));
  await db.$client.end();
});

describe('course page progress on real MySQL', () => {
  it('reads one course for one member, and nothing from their other courses or other members', async () => {
    const learner = await member();
    const other = await member();
    const asked = await courseWithLessons(['แนะนำ', 'Flexbox', 'Grid']);
    const elsewhere = await courseWithLessons(['บทอื่น', 'บทอื่นอีก']);
    await db.insert(enrollments).values([
      { id: id('e'), userId: learner, courseId: asked.courseId },
      { id: id('e'), userId: learner, courseId: elsewhere.courseId },
      { id: id('e'), userId: other, courseId: asked.courseId },
    ]);
    const watched = new Date('2026-09-02T00:00:00Z');
    await db.insert(lessonProgress).values([
      { id: id('p'), userId: learner, lessonId: asked.lessonIds[0], completed: true, watchTimeSeconds: 300, lastWatchedAt: watched },
      { id: id('p'), userId: learner, lessonId: elsewhere.lessonIds[0], completed: true, watchTimeSeconds: 300, lastWatchedAt: watched },
      { id: id('p'), userId: learner, lessonId: elsewhere.lessonIds[1], completed: true, watchTimeSeconds: 300, lastWatchedAt: watched },
      { id: id('p'), userId: other, lessonId: asked.lessonIds[1], completed: true, watchTimeSeconds: 300, lastWatchedAt: watched },
    ]);

    await expect(learning.getCourseLearning(learner, asked.courseId)).resolves.toEqual({
      progress: { completedLessons: 1, totalLessons: 3, percent: 33 },
      continuation: 'resume',
      completed: false,
      nextLesson: { title: 'Flexbox', position: 2 },
    });
  });

  it('returns null for a course the member is not enrolled in', async () => {
    const learner = await member();
    const course = await courseWithLessons(['แนะนำ']);

    await expect(learning.getCourseLearning(learner, course.courseId)).resolves.toBeNull();
  });
});

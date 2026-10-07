import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomBytes } from 'node:crypto';
import { inArray, sql } from 'drizzle-orm';
import { courses, lessonQuizQuestions, lessons, reviews, users } from '@/lib/db/schema';

/**
 * Home's evidence on real MySQL: only reviews the course page already shows publicly reach Home,
 * and a published course's quiz is what lets Home mention quizzes.
 */

let db: typeof import('@/lib/db').db;
let proof: typeof import('@/lib/home/proof');
const suffix = randomBytes(6).toString('hex');
let counter = 0;
const created = { users: [] as string[], courses: [] as string[] };
const id = (kind: string) => `hp-${suffix}-${kind}-${counter++}`;
// Far-future timestamps put these rows ahead of anything else in the shared database.
const future = (minutes: number) => new Date(Date.UTC(2099, 0, 1, 0, minutes));

async function course(status: 'published' | 'draft') {
  const courseId = id('c');
  await db.insert(courses).values({ id: courseId, title: `Course ${courseId}`, slug: `home-proof-${courseId}`, price: '100', status });
  created.courses.push(courseId);
  return courseId;
}

async function review(courseId: string, values: Partial<typeof reviews.$inferInsert>) {
  const reviewId = id('r');
  await db.insert(reviews).values({
    id: reviewId,
    courseId,
    rating: 5,
    comment: 'สอนเข้าใจง่ายมาก',
    isVerified: true,
    isHidden: false,
    createdAt: future(counter),
    ...values,
  });
  return reviewId;
}

beforeAll(async () => {
  // Deliberately refuse owner databases and non-loopback connections.
  const target = new URL(process.env.DATABASE_URL ?? 'invalid');
  if (target.protocol !== 'mysql:' || target.hostname !== '127.0.0.1' || target.pathname !== '/milerdev_e2e') {
    throw new Error('Home proof integration tests require the dedicated loopback milerdev_e2e database');
  }
  ({ db } = await import('@/lib/db'));
  proof = await import('@/lib/home/proof');
  await db.execute(sql`SELECT 1`);
});

afterAll(async () => {
  if (!db) return;
  // Only rows created here are removed; courses cascade to reviews, lessons and quiz questions.
  if (created.courses.length) await db.delete(courses).where(inArray(courses.id, created.courses));
  if (created.users.length) await db.delete(users).where(inArray(users.id, created.users));
  await db.$client.end();
});

describe('Home proof on real MySQL', () => {
  it('shows only verified, visible, well-rated, written reviews of published courses', async () => {
    const published = await course('published');
    const draft = await course('draft');
    const userId = id('u');
    await db.insert(users).values({ id: userId, email: `${userId}@example.test`, name: 'ผู้เรียนทดสอบ' });
    created.users.push(userId);

    const shown = await review(published, { userId, displayName: null });
    const excluded = [
      await review(published, { isVerified: false }),
      await review(published, { isHidden: true }),
      await review(published, { rating: 3 }),
      await review(published, { comment: '   ' }),
      await review(published, { comment: null }),
      await review(draft, {}),
    ];

    const result = await proof.getHomeReviews();
    const ids = result.map((item) => item.id);

    expect(result.length).toBeLessThanOrEqual(3);
    expect(ids).toContain(shown);
    for (const reviewId of excluded) expect(ids).not.toContain(reviewId);
    expect(result.find((item) => item.id === shown)).toMatchObject({
      rating: 5,
      comment: 'สอนเข้าใจง่ายมาก',
      reviewerName: 'ผู้เรียนทดสอบ',
      courseSlug: `home-proof-${published}`,
    });
  });

  it('names a reviewer by their display name first, like the course page does', async () => {
    const published = await course('published');
    const reviewId = await review(published, { displayName: 'มิน', createdAt: future(500) });

    const result = await proof.getHomeReviews();

    expect(result.find((item) => item.id === reviewId)?.reviewerName).toBe('มิน');
  });

  it('reports a practice quiz once a published course has one', async () => {
    const published = await course('published');
    const lessonId = id('l');
    await db.insert(lessons).values({ id: lessonId, courseId: published, title: 'Lesson', orderIndex: 100 });
    await db.insert(lessonQuizQuestions).values({
      lessonId,
      prompt: 'ข้อหนึ่ง',
      options: [{ id: 'a', text: 'ถูก', isCorrect: true }, { id: 'b', text: 'ผิด', isCorrect: false }],
      orderIndex: 100,
    });

    expect(await proof.hasPublishedLessonQuiz()).toBe(true);
  });
});

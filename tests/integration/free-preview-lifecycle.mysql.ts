import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomBytes } from 'node:crypto';
import { eq, inArray, sql } from 'drizzle-orm';
import { courses, enrollments, lessonProgress, lessonQuizAttempts, lessonQuizQuestions, lessons, users } from '@/lib/db/schema';

/**
 * Free previews are public only while their course is published. A visitor who is not enrolled
 * gets nothing from a draft or archived course: no lesson content, no playback URL, no curriculum,
 * and no progress or quiz writes. An enrolled learner keeps access when a course is archived.
 */

type CourseStatus = 'draft' | 'published' | 'archived';

let db: typeof import('@/lib/db').db;
let workspace: typeof import('@/lib/learning/workspace');
let progress: typeof import('@/lib/learning/progress');
let quiz: typeof import('@/lib/learning/lesson-quiz-store');
const suffix = randomBytes(6).toString('hex');
let counter = 0;
const created = { courses: [] as string[], users: [] as string[] };
const id = (kind: string) => `fp-${suffix}-${kind}-${counter++}`;

async function seedCourse(status: CourseStatus) {
    const courseId = id('c');
    const slug = `free-preview-${status}-${courseId}`;
    await db.insert(courses).values({ id: courseId, title: `Course ${courseId}`, slug, price: '990.00', status });
    created.courses.push(courseId);
    const previewId = id('p');
    const paidId = id('q');
    await db.insert(lessons).values([
        { id: previewId, courseId, title: 'Preview lesson', content: '<p>preview</p>', orderIndex: 0, isFreePreview: true },
        { id: paidId, courseId, title: 'Unreleased lesson', content: '<p>paid</p>', orderIndex: 1, isFreePreview: false },
    ]);
    await db.insert(lessonQuizQuestions).values({
        id: id('qq'), lessonId: previewId, prompt: 'Question', orderIndex: 0,
        options: [{ id: 'a', text: 'A', isCorrect: true }, { id: 'b', text: 'B', isCorrect: false }],
    });
    return { courseId, slug, previewId, paidId };
}

async function seedUser() {
    const userId = id('u');
    await db.insert(users).values({ id: userId, email: `${userId}@example.test`, name: 'Learner', role: 'student' });
    created.users.push(userId);
    return userId;
}

const view = (memberId: string | null, courseSlug: string, lessonId: string) =>
    workspace.getLearningWorkspaceProjection({ memberId, courseSlug, lessonId });

beforeAll(async () => {
    // Deliberately refuse owner databases and non-loopback connections.
    const target = new URL(process.env.DATABASE_URL ?? 'invalid');
    if (target.protocol !== 'mysql:' || target.hostname !== '127.0.0.1' || target.pathname !== '/milerdev_e2e') {
        throw new Error('Free-preview lifecycle integration tests require the dedicated loopback milerdev_e2e database');
    }
    ({ db } = await import('@/lib/db'));
    workspace = await import('@/lib/learning/workspace');
    progress = await import('@/lib/learning/progress');
    quiz = await import('@/lib/learning/lesson-quiz-store');
    await db.execute(sql`SELECT 1`);
});

afterAll(async () => {
    if (!db) return;
    // Only rows created here are removed, children first; shared tables are never truncated.
    if (created.users.length) {
        await db.delete(lessonQuizAttempts).where(inArray(lessonQuizAttempts.userId, created.users));
        await db.delete(lessonProgress).where(inArray(lessonProgress.userId, created.users));
        await db.delete(enrollments).where(inArray(enrollments.userId, created.users));
    }
    if (created.courses.length) {
        const lessonIds = (await db.select({ id: lessons.id }).from(lessons).where(inArray(lessons.courseId, created.courses)))
            .map((row) => row.id);
        if (lessonIds.length) await db.delete(lessonQuizQuestions).where(inArray(lessonQuizQuestions.lessonId, lessonIds));
        await db.delete(lessons).where(inArray(lessons.courseId, created.courses));
        await db.delete(courses).where(inArray(courses.id, created.courses));
    }
    if (created.users.length) await db.delete(users).where(inArray(users.id, created.users));
    await db.$client.end();
});

describe('free-preview lessons and the course lifecycle', () => {
    it('serves the free preview of a published course to a visitor', async () => {
        const seed = await seedCourse('published');

        const projection = await view(null, seed.slug, seed.previewId);

        expect(projection.kind).toBe('ready');
        expect(await view(null, seed.slug, seed.paidId)).toEqual({ kind: 'access_denied', courseSlug: seed.slug });
    });

    for (const status of ['draft', 'archived'] as const) {
        it(`serves nothing from a ${status} course to a visitor or a signed-in member who is not enrolled`, async () => {
            const seed = await seedCourse(status);
            const memberId = await seedUser();

            for (const viewer of [null, memberId]) {
                expect(await view(viewer, seed.slug, seed.previewId)).toEqual({ kind: 'not_found' });
                expect(await view(viewer, seed.slug, seed.paidId)).toEqual({ kind: 'not_found' });
            }
        });

        it(`rejects progress and quiz writes on the free preview of a ${status} course without an enrollment`, async () => {
            const seed = await seedCourse(status);
            const memberId = await seedUser();

            expect(await progress.updateLearningProgress({ userId: memberId, lessonId: seed.previewId, completed: true }))
                .toMatchObject({ status: 'forbidden' });
            expect(await quiz.submitLessonQuizAttempt({ userId: memberId, lessonId: seed.previewId, answers: {} }))
                .toEqual({ status: 'forbidden' });
            expect(await db.select().from(lessonProgress).where(eq(lessonProgress.userId, memberId))).toEqual([]);
        });
    }

    it('keeps an archived course open to an enrolled learner', async () => {
        const seed = await seedCourse('archived');
        const memberId = await seedUser();
        await db.insert(enrollments).values({ userId: memberId, courseId: seed.courseId });

        const projection = await view(memberId, seed.slug, seed.paidId);

        expect(projection.kind).toBe('ready');
        expect(await progress.updateLearningProgress({ userId: memberId, lessonId: seed.paidId, completed: true }))
            .not.toMatchObject({ status: 'forbidden' });
    });
});

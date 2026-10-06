import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomBytes } from 'node:crypto';
import { asc, eq, inArray, sql } from 'drizzle-orm';
import { courseSections, courses, lessonProgress, lessons, users } from '@/lib/db/schema';

/**
 * Course sections on real MySQL: every structure write keeps lessons.order_index as the one
 * learning order (unsectioned lessons first, then each section's lessons), and removing a
 * section never removes lessons or the progress attached to them.
 */

let db: typeof import('@/lib/db').db;
let store: typeof import('@/lib/courses/course-structure-store');
const suffix = randomBytes(6).toString('hex');
let counter = 0;
const created = { users: [] as string[], courses: [] as string[] };
const id = (kind: string) => `cs-${suffix}-${kind}-${counter++}`;

async function seedCourse() {
    const courseId = id('c');
    await db.insert(courses).values({ id: courseId, title: 'Sections', slug: `sections-${courseId}`, price: '0', status: 'published' });
    created.courses.push(courseId);
    const [s1, s2] = [id('s'), id('s')];
    await db.insert(courseSections).values([
        { id: s1, courseId, title: 'One', orderIndex: 100 },
        { id: s2, courseId, title: 'Two', orderIndex: 200 },
    ]);
    const [intro, a1, a2, b1] = [id('l'), id('l'), id('l'), id('l')];
    await db.insert(lessons).values([
        { id: intro, courseId, title: 'Intro', orderIndex: 100, sectionId: null },
        { id: a1, courseId, title: 'A1', orderIndex: 200, sectionId: s1 },
        { id: a2, courseId, title: 'A2', orderIndex: 300, sectionId: s1 },
        { id: b1, courseId, title: 'B1', orderIndex: 400, sectionId: s2 },
    ]);
    return { courseId, s1, s2, intro, a1, a2, b1 };
}

const learningOrder = async (courseId: string) => db
    .select({ id: lessons.id, sectionId: lessons.sectionId })
    .from(lessons)
    .where(eq(lessons.courseId, courseId))
    .orderBy(asc(lessons.orderIndex));
const sectionOrder = async (courseId: string) => (await db
    .select({ id: courseSections.id })
    .from(courseSections)
    .where(eq(courseSections.courseId, courseId))
    .orderBy(asc(courseSections.orderIndex))).map((row) => row.id);

beforeAll(async () => {
    // Deliberately refuse owner databases and non-loopback connections.
    const target = new URL(process.env.DATABASE_URL ?? 'invalid');
    if (target.protocol !== 'mysql:' || target.hostname !== '127.0.0.1' || target.pathname !== '/milerdev_e2e') {
        throw new Error('Course structure integration tests require the dedicated loopback milerdev_e2e database');
    }
    ({ db } = await import('@/lib/db'));
    store = await import('@/lib/courses/course-structure-store');
    await db.execute(sql`SELECT 1`);
});

afterAll(async () => {
    if (!db) return;
    // Only rows created here are removed; deleting a course cascades to its sections and lessons.
    if (created.users.length) await db.delete(lessonProgress).where(inArray(lessonProgress.userId, created.users));
    if (created.courses.length) await db.delete(courses).where(inArray(courses.id, created.courses));
    if (created.users.length) await db.delete(users).where(inArray(users.id, created.users));
    await db.$client.end();
});

describe('course structure on real MySQL', () => {
    it('saves section order and moves lessons between sections in one learning order', async () => {
        const c = await seedCourse();

        const result = await store.saveCourseStructure(c.courseId, {
            unsectionedLessonIds: [],
            sections: [
                { id: c.s2, lessonIds: [c.b1, c.intro] },
                { id: c.s1, lessonIds: [c.a2, c.a1] },
            ],
        });

        expect(result).toEqual({ ok: true });
        expect(await sectionOrder(c.courseId)).toEqual([c.s2, c.s1]);
        expect(await learningOrder(c.courseId)).toEqual([
            { id: c.b1, sectionId: c.s2 },
            { id: c.intro, sectionId: c.s2 },
            { id: c.a2, sectionId: c.s1 },
            { id: c.a1, sectionId: c.s1 },
        ]);
    });

    it('rejects a structure that pulls in another course\'s lesson and writes nothing', async () => {
        const c = await seedCourse();
        const other = await seedCourse();
        const before = await learningOrder(c.courseId);

        const result = await store.saveCourseStructure(c.courseId, {
            unsectionedLessonIds: [c.intro, other.intro],
            sections: [{ id: c.s1, lessonIds: [c.a1, c.a2] }, { id: c.s2, lessonIds: [c.b1] }],
        });

        expect(result).toMatchObject({ ok: false, status: 409 });
        expect(await learningOrder(c.courseId)).toEqual(before);
        expect((await learningOrder(other.courseId))[0]).toEqual({ id: other.intro, sectionId: null });
    });

    it('deletes a section by moving its lessons into the previous one, keeping order and progress', async () => {
        const c = await seedCourse();
        const userId = id('u');
        await db.insert(users).values({ id: userId, email: `${userId}@example.test` });
        created.users.push(userId);
        await db.insert(lessonProgress).values({ userId, lessonId: c.b1, completed: true });

        expect(await store.deleteCourseSection(c.courseId, c.s2)).toEqual({ ok: true });

        expect(await sectionOrder(c.courseId)).toEqual([c.s1]);
        expect(await learningOrder(c.courseId)).toEqual([
            { id: c.intro, sectionId: null },
            { id: c.a1, sectionId: c.s1 },
            { id: c.a2, sectionId: c.s1 },
            { id: c.b1, sectionId: c.s1 },
        ]);
        const progress = await db.select().from(lessonProgress).where(eq(lessonProgress.userId, userId));
        expect(progress).toHaveLength(1);
        expect(progress[0].completed).toBe(true);
    });

    it('refuses to delete a section that belongs to another course', async () => {
        const c = await seedCourse();
        const other = await seedCourse();

        expect(await store.deleteCourseSection(c.courseId, other.s1)).toMatchObject({ ok: false, status: 404 });
        expect(await sectionOrder(other.courseId)).toEqual([other.s1, other.s2]);
    });

    it('adds a lesson at the end of a middle section, before later sections', async () => {
        const c = await seedCourse();
        const lessonId = id('l');

        expect(await store.createLessonInSection(c.courseId, c.s1, { id: lessonId, title: 'A3' })).toEqual({ ok: true });

        expect((await learningOrder(c.courseId)).map((row) => row.id)).toEqual([c.intro, c.a1, c.a2, lessonId, c.b1]);
    });

    it('rejects a lesson for a section of another course without inserting it', async () => {
        const c = await seedCourse();
        const other = await seedCourse();
        const lessonId = id('l');

        expect(await store.createLessonInSection(c.courseId, other.s1, { id: lessonId, title: 'Stray' }))
            .toMatchObject({ ok: false, status: 404 });
        expect(await db.select().from(lessons).where(eq(lessons.id, lessonId))).toEqual([]);
    });

    it('keeps lessons when a section row is deleted directly (ON DELETE SET NULL)', async () => {
        const c = await seedCourse();

        await db.delete(courseSections).where(eq(courseSections.id, c.s1));

        expect(await learningOrder(c.courseId)).toEqual([
            { id: c.intro, sectionId: null },
            { id: c.a1, sectionId: null },
            { id: c.a2, sectionId: null },
            { id: c.b1, sectionId: c.s2 },
        ]);
    });
});

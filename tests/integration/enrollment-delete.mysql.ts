import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { randomBytes } from 'node:crypto';
import { eq, inArray, sql } from 'drizzle-orm';
import {
    courses, enrollments, lessonProgress, lessons, users,
} from '@/lib/db/schema';

/**
 * Characterization of deleting an enrollment (and what depends on it) on real MySQL.
 *
 * Deleting an enrollment or its course used to be blocked by measurement_outbox rows (#147).
 * That table is retired and dropped by migration 0023, so these tests pin that both deletes
 * now go through and that the admin route removes only that course's progress.
 */

const mocks = vi.hoisted(() => ({
    auth: vi.fn(),
    logAudit: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/lib/auth', () => ({ auth: mocks.auth }));
vi.mock('@/lib/auditLog', () => ({
    logAudit: mocks.logAudit,
    getAuditContext: vi.fn().mockResolvedValue({}),
}));

let db: typeof import('@/lib/db').db;
let route: typeof import('@/app/api/admin/enrollments/[id]/route');
const suffix = randomBytes(6).toString('hex');
let counter = 0;
const created = { users: [] as string[], courses: [] as string[] };
const id = (kind: string) => `ed-${suffix}-${kind}-${counter++}`;

async function seedEnrollment() {
    const userId = id('u');
    const courseId = id('c');
    const lessonId = id('l');
    const otherCourseId = id('c');
    const otherLessonId = id('l');
    await db.insert(users).values({ id: userId, email: `${userId}@example.test`, name: 'Learner' });
    await db.insert(courses).values([
        { id: courseId, title: 'Course', slug: `course-${courseId}`, price: '0', status: 'published' },
        { id: otherCourseId, title: 'Other', slug: `course-${otherCourseId}`, price: '0', status: 'published' },
    ]);
    await db.insert(lessons).values([
        { id: lessonId, courseId, title: 'L', orderIndex: 0 },
        { id: otherLessonId, courseId: otherCourseId, title: 'L', orderIndex: 0 },
    ]);
    const enrollmentId = id('e');
    await db.insert(enrollments).values({ id: enrollmentId, userId, courseId });
    await db.insert(lessonProgress).values([
        { userId, lessonId, completed: true },
        { userId, lessonId: otherLessonId, completed: true },
    ]);
    created.users.push(userId); created.courses.push(courseId, otherCourseId);
    return { userId, courseId, lessonId, otherLessonId, enrollmentId };
}
const enrollmentExists = async (enrollmentId: string) =>
    (await db.select().from(enrollments).where(eq(enrollments.id, enrollmentId))).length === 1;
const callDelete = (enrollmentId: string) => route.DELETE(
    new Request('http://localhost/api/admin/enrollments/x', { method: 'DELETE' }),
    { params: Promise.resolve({ id: enrollmentId }) },
);

beforeAll(async () => {
    // Deliberately refuse owner databases and non-loopback connections.
    const target = new URL(process.env.DATABASE_URL ?? 'invalid');
    if (target.protocol !== 'mysql:' || target.hostname !== '127.0.0.1' || target.pathname !== '/milerdev_e2e') {
        throw new Error('Enrollment delete integration tests require the dedicated loopback milerdev_e2e database');
    }
    ({ db } = await import('@/lib/db'));
    route = await import('@/app/api/admin/enrollments/[id]/route');
    await db.execute(sql`SELECT 1`);
});

afterAll(async () => {
    if (!db) return;
    // Only rows created here are removed; shared tables are never truncated.
    if (created.users.length) {
        await db.delete(lessonProgress).where(inArray(lessonProgress.userId, created.users));
        await db.delete(enrollments).where(inArray(enrollments.userId, created.users));
    }
    if (created.courses.length) {
        await db.delete(lessons).where(inArray(lessons.courseId, created.courses));
        await db.delete(courses).where(inArray(courses.id, created.courses));
    }
    if (created.users.length) await db.delete(users).where(inArray(users.id, created.users));
    await db.$client.end();
});

describe('deleting an enrollment on real MySQL', () => {
    it('deletes an enrollment', async () => {
        const a = await seedEnrollment();

        await db.delete(enrollments).where(eq(enrollments.id, a.enrollmentId));

        expect(await enrollmentExists(a.enrollmentId)).toBe(false);
    });

    it('removes the enrollment when its course is deleted (ON DELETE CASCADE)', async () => {
        const a = await seedEnrollment();

        await db.delete(courses).where(eq(courses.id, a.courseId));

        expect(await enrollmentExists(a.enrollmentId)).toBe(false);
    });
});

describe('admin DELETE /api/admin/enrollments/[id] on real MySQL', () => {
    it('removes the enrollment and only that course\'s progress', async () => {
        mocks.auth.mockResolvedValue({ user: { id: 'admin-1', role: 'admin' } });
        const a = await seedEnrollment();

        const res = await callDelete(a.enrollmentId);

        expect(res.status).toBe(200);
        expect(await enrollmentExists(a.enrollmentId)).toBe(false);
        const left = await db.select().from(lessonProgress).where(eq(lessonProgress.userId, a.userId));
        expect(left.map((r) => r.lessonId)).toEqual([a.otherLessonId]);
    });

});

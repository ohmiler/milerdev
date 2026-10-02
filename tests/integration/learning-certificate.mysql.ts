import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { randomBytes } from 'node:crypto';
import { and, eq, inArray, sql } from 'drizzle-orm';
import {
    certificates, courses, enrollments, lessonProgress, lessons, users,
} from '@/lib/db/schema';

/**
 * Characterization of certificate issuance and lesson progress on real MySQL.
 *
 * `certificates` has no unique (user, course) constraint: "one certificate per learner per
 * course" holds only because issuance locks the user row (SELECT ... FOR UPDATE). The
 * concurrency tests below are therefore the only thing guarding that rule.
 * Pins CURRENT behavior; KNOWN BEHAVIOR marks things worth a conscious decision later.
 */

const mocks = vi.hoisted(() => ({
    sendCertificateEmail: vi.fn().mockResolvedValue(true),
    notify: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/lib/notifications/email', () => ({ sendCertificateEmail: mocks.sendCertificateEmail }));
vi.mock('@/lib/notifications/notify', () => ({ notify: mocks.notify }));

let db: typeof import('@/lib/db').db;
let issuance: typeof import('@/lib/certificates/issuance');
let progress: typeof import('@/lib/learning/progress');
const suffix = randomBytes(6).toString('hex');
let counter = 0;
const created = { users: [] as string[], courses: [] as string[] };
const id = (kind: string) => `lc-${suffix}-${kind}-${counter++}`;

async function seedLearner(opts: { lessons?: number; completed?: boolean; enrolled?: boolean } = {}) {
    const userId = id('u');
    const courseId = id('c');
    await db.insert(users).values({ id: userId, email: `${userId}@example.test`, name: 'Learner Name' });
    await db.insert(courses).values({ id: courseId, title: 'Course Title', slug: `course-${courseId}`, price: '0', status: 'published' });
    created.users.push(userId); created.courses.push(courseId);
    const lessonIds: string[] = [];
    for (let i = 0; i < (opts.lessons ?? 1); i++) {
        const lessonId = id('l');
        await db.insert(lessons).values({ id: lessonId, courseId, title: `Lesson ${i}`, orderIndex: i });
        lessonIds.push(lessonId);
    }
    if (opts.enrolled !== false) {
        await db.insert(enrollments).values({
            userId, courseId, ...(opts.completed ? { completedAt: new Date(Date.now() - 60_000), progressPercent: 100 } : {}),
        });
    }
    return { userId, courseId, lessonIds };
}
const certsFor = (userId: string) => db.select().from(certificates).where(eq(certificates.userId, userId));
const enrollmentOf = async (userId: string, courseId: string) =>
    (await db.select().from(enrollments).where(and(eq(enrollments.userId, userId), eq(enrollments.courseId, courseId))))[0];
const complete = (userId: string, lessonId: string, completed = true) =>
    progress.updateLearningProgress({ userId, lessonId, completed, watchTimeSeconds: 10 });

beforeAll(async () => {
    // Deliberately refuse owner databases and non-loopback connections.
    const target = new URL(process.env.DATABASE_URL ?? 'invalid');
    if (target.protocol !== 'mysql:' || target.hostname !== '127.0.0.1' || target.pathname !== '/milerdev_e2e') {
        throw new Error('Certificate integration tests require the dedicated loopback milerdev_e2e database');
    }
    ({ db } = await import('@/lib/db'));
    issuance = await import('@/lib/certificates/issuance');
    progress = await import('@/lib/learning/progress');
    await db.execute(sql`SELECT 1`);
});

afterAll(async () => {
    if (!db) return;
    // Only rows created here are removed; shared tables are never truncated.
    if (created.users.length) {
        await db.delete(certificates).where(inArray(certificates.userId, created.users));
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

describe('certificate issuance on real MySQL', () => {
    it('issues a certificate for a completed enrollment, copying learner, course and completion date', async () => {
        const a = await seedLearner({ completed: true });
        const enrollment = await enrollmentOf(a.userId, a.courseId);

        const result = await issuance.ensureCompletedCertificate(a.userId, a.courseId);

        expect(result.kind).toBe('issued');
        const [row] = await certsFor(a.userId);
        expect(row.certificateCode).toMatch(/^CERT-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
        expect(row.recipientName).toBe('Learner Name');
        expect(row.courseTitle).toBe('Course Title');
        expect(row.completedAt.getTime()).toBe(enrollment.completedAt!.getTime());
        expect(row.revokedAt).toBeNull();
    });

    it('refuses to issue on completion authority when the course is not completed', async () => {
        const a = await seedLearner({ completed: false });

        expect(await issuance.ensureCompletedCertificate(a.userId, a.courseId)).toEqual({ kind: 'not_completed' });
        expect(await certsFor(a.userId)).toHaveLength(0);
    });

    it('lets explicit admin intent issue without completion', async () => {
        const a = await seedLearner({ completed: false });

        const { certificate, isNew } = await issuance.issueCertificate(a.userId, a.courseId);

        expect(isNew).toBe(true);
        expect(certificate.userId).toBe(a.userId);
        expect(await certsFor(a.userId)).toHaveLength(1);
    });

    it('serializes concurrent completion-authority issuance into exactly one certificate', async () => {
        const a = await seedLearner({ completed: true });

        const results = await Promise.all([1, 2, 3].map(() => issuance.ensureCompletedCertificate(a.userId, a.courseId)));

        expect(results.filter((r) => r.kind === 'issued')).toHaveLength(1);
        expect(await certsFor(a.userId)).toHaveLength(1);
    });

    it('serializes an admin issue racing a completion issue into exactly one certificate', async () => {
        const a = await seedLearner({ completed: true });

        await Promise.all([
            issuance.issueCertificate(a.userId, a.courseId),
            issuance.ensureCompletedCertificate(a.userId, a.courseId),
        ]);

        expect(await certsFor(a.userId)).toHaveLength(1);
    });

    it('returns the existing certificate instead of issuing a second one', async () => {
        const a = await seedLearner({ completed: true });
        const first = await issuance.ensureCompletedCertificate(a.userId, a.courseId);

        const second = await issuance.ensureCompletedCertificate(a.userId, a.courseId);

        expect(second).toMatchObject({ kind: 'ready', code: (first as { code: string }).code });
        expect(await certsFor(a.userId)).toHaveLength(1);
    });

    it('does not reissue over a revoked certificate, for either authority (KNOWN BEHAVIOR)', async () => {
        const a = await seedLearner({ completed: true });
        await issuance.ensureCompletedCertificate(a.userId, a.courseId);
        await db.update(certificates).set({ revokedAt: new Date(), revokedReason: 'test' }).where(eq(certificates.userId, a.userId));

        expect((await issuance.ensureCompletedCertificate(a.userId, a.courseId)).kind).toBe('revoked');
        const admin = await issuance.issueCertificate(a.userId, a.courseId);
        expect(admin.isNew).toBe(false);
        expect(admin.certificate.revokedAt).not.toBeNull();
        expect(await certsFor(a.userId)).toHaveLength(1);
    });

    it('sends the email and notification only for a newly issued certificate', async () => {
        const a = await seedLearner({ completed: true });
        mocks.sendCertificateEmail.mockClear();
        mocks.notify.mockClear();

        await issuance.ensureCompletedCertificate(a.userId, a.courseId);
        await issuance.ensureCompletedCertificate(a.userId, a.courseId);

        expect(mocks.sendCertificateEmail).toHaveBeenCalledTimes(1);
        expect(mocks.notify).toHaveBeenCalledTimes(1);
    });
});

describe('lesson progress on real MySQL', () => {
    it('completing the last lesson completes the enrollment and issues the certificate', async () => {
        const a = await seedLearner({ lessons: 2 });
        await complete(a.userId, a.lessonIds[0]);

        const result = await complete(a.userId, a.lessonIds[1]);

        expect(result).toMatchObject({ status: 'saved', courseCompleted: true });
        const enrollment = await enrollmentOf(a.userId, a.courseId);
        expect(enrollment.progressPercent).toBe(100);
        expect(enrollment.completedAt).toBeInstanceOf(Date);
        expect(await certsFor(a.userId)).toHaveLength(1);
    });

    it('completing one of two lessons reaches 50% and issues nothing', async () => {
        const a = await seedLearner({ lessons: 2 });

        const result = await complete(a.userId, a.lessonIds[0]);

        expect(result).toMatchObject({ status: 'saved', courseCompleted: false });
        const enrollment = await enrollmentOf(a.userId, a.courseId);
        expect(enrollment.progressPercent).toBe(50);
        expect(enrollment.completedAt).toBeNull();
        expect(await certsFor(a.userId)).toHaveLength(0);
    });

    it('keeps certificate and progress consistent when the last two lessons finish at once (KNOWN DEFECT: lost update)', async () => {
        const a = await seedLearner({ lessons: 2 });

        await Promise.all(a.lessonIds.map((lessonId) => complete(a.userId, lessonId)));

        // Both lessons are saved as completed...
        const rows = await db.select().from(lessonProgress).where(eq(lessonProgress.userId, a.userId));
        expect(rows.filter((r) => r.completed)).toHaveLength(2);
        // ...but each transaction counts completed lessons from its own snapshot, so on MySQL
        // the enrollment can be left at 50% with no certificate even though every lesson is
        // done (observed on every local run). The invariant that must hold either way:
        // a certificate exists exactly when the enrollment reached 100%, and never twice.
        // When this defect is fixed, tighten this to expect 100% and exactly one certificate.
        const enrollment = await enrollmentOf(a.userId, a.courseId);
        expect([50, 100]).toContain(enrollment.progressPercent);
        expect(await certsFor(a.userId)).toHaveLength(enrollment.progressPercent === 100 ? 1 : 0);
    });

    it('refuses progress on a paid lesson without an enrollment and writes nothing', async () => {
        const a = await seedLearner({ enrolled: false });

        expect(await complete(a.userId, a.lessonIds[0])).toEqual({ status: 'forbidden' });
        expect(await db.select().from(lessonProgress).where(eq(lessonProgress.userId, a.userId))).toHaveLength(0);
    });

    it('saves progress on a free-preview lesson without creating an enrollment', async () => {
        const a = await seedLearner({ enrolled: false });
        await db.update(lessons).set({ isFreePreview: true }).where(eq(lessons.id, a.lessonIds[0]));

        const result = await complete(a.userId, a.lessonIds[0]);

        expect(result).toMatchObject({ status: 'saved', enrollmentId: null, courseCompleted: false });
        expect(await db.select().from(enrollments).where(eq(enrollments.userId, a.userId))).toHaveLength(0);
    });

    it('never lowers watch time', async () => {
        const a = await seedLearner();
        await progress.updateLearningProgress({ userId: a.userId, lessonId: a.lessonIds[0], watchTimeSeconds: 90 });

        await progress.updateLearningProgress({ userId: a.userId, lessonId: a.lessonIds[0], watchTimeSeconds: 30 });

        const [row] = await db.select().from(lessonProgress).where(eq(lessonProgress.userId, a.userId));
        expect(row.watchTimeSeconds).toBe(90);
    });

    it('un-completing a lesson clears course completion but keeps the issued certificate (KNOWN BEHAVIOR)', async () => {
        const a = await seedLearner();
        await complete(a.userId, a.lessonIds[0]);
        expect(await certsFor(a.userId)).toHaveLength(1);

        await complete(a.userId, a.lessonIds[0], false);

        const enrollment = await enrollmentOf(a.userId, a.courseId);
        expect(enrollment.completedAt).toBeNull();
        expect(enrollment.progressPercent).toBe(0);
        const certs = await certsFor(a.userId);
        expect(certs).toHaveLength(1);
        expect(certs[0].revokedAt).toBeNull();
    });
});

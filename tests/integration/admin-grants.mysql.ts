import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { randomBytes } from 'node:crypto';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { certificates, courses, enrollments, users } from '@/lib/db/schema';

/**
 * Characterization of the admin routes that grant access on real MySQL: a manual enrollment
 * (two routes) and a manually issued certificate. These are the "explicit admin intent" paths
 * that bypass payment and completion, so their duplicate handling rests on real indexes and
 * row locks. KNOWN BEHAVIOR / KNOWN DEFECT mark pinned behavior that is documented, not endorsed.
 */

const mocks = vi.hoisted(() => ({
    auth: vi.fn(),
    logAudit: vi.fn().mockResolvedValue(undefined),
    logError: vi.fn(),
    sendCertificateEmail: vi.fn().mockResolvedValue(undefined),
    notify: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/lib/auth', () => ({ auth: mocks.auth }));
vi.mock('@/lib/auditLog', () => ({
    logAudit: mocks.logAudit,
    getAuditContext: vi.fn().mockResolvedValue({}),
}));
vi.mock('@/lib/error-handler', () => ({ logError: mocks.logError }));
vi.mock('@/lib/notifications/email', () => ({ sendCertificateEmail: mocks.sendCertificateEmail }));
vi.mock('@/lib/notifications/notify', () => ({ notify: mocks.notify }));

let db: typeof import('@/lib/db').db;
let enrollmentsRoute: typeof import('@/app/api/admin/enrollments/route');
let userEnrollmentsRoute: typeof import('@/app/api/admin/users/[id]/enrollments/route');
let certificatesRoute: typeof import('@/app/api/admin/certificates/route');
const suffix = randomBytes(6).toString('hex');
let counter = 0;
const created = { users: [] as string[], courses: [] as string[] };
const id = (kind: string) => `ag-${suffix}-${kind}-${counter++}`;

async function seedLearnerAndCourse() {
    const userId = id('u');
    const courseId = id('c');
    await db.insert(users).values({ id: userId, email: `${userId}@example.test`, name: 'Learner' });
    await db.insert(courses).values({
        id: courseId, title: `Course ${courseId}`, slug: `course-${courseId}`, price: '1990.00', status: 'published',
    });
    created.users.push(userId);
    created.courses.push(courseId);
    return { userId, courseId };
}

const json = (body: unknown) => ({
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
});
const grant = (userId: string, courseId: string) =>
    enrollmentsRoute.POST(new Request('http://localhost/api/admin/enrollments', json({ userId, courseId })));
const grantFromUserPage = (userId: string, courseId: string) =>
    userEnrollmentsRoute.POST(
        new Request(`http://localhost/api/admin/users/${userId}/enrollments`, json({ courseId })),
        { params: Promise.resolve({ id: userId }) },
    );
const issue = (userId: string, courseId: string) =>
    certificatesRoute.POST(new Request('http://localhost/api/admin/certificates', json({ userId, courseId })));
const enrollmentRows = (userId: string, courseId: string) =>
    db.select().from(enrollments).where(and(eq(enrollments.userId, userId), eq(enrollments.courseId, courseId)));
const certificateRows = (userId: string, courseId: string) =>
    db.select().from(certificates).where(and(eq(certificates.userId, userId), eq(certificates.courseId, courseId)));

beforeAll(async () => {
    // Deliberately refuse owner databases and non-loopback connections.
    const target = new URL(process.env.DATABASE_URL ?? 'invalid');
    if (target.protocol !== 'mysql:' || target.hostname !== '127.0.0.1' || target.pathname !== '/milerdev_e2e') {
        throw new Error('Admin grant integration tests require the dedicated loopback milerdev_e2e database');
    }
    ({ db } = await import('@/lib/db'));
    enrollmentsRoute = await import('@/app/api/admin/enrollments/route');
    userEnrollmentsRoute = await import('@/app/api/admin/users/[id]/enrollments/route');
    certificatesRoute = await import('@/app/api/admin/certificates/route');
    await db.execute(sql`SELECT 1`);
});

beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ user: { id: 'admin-integration', role: 'admin' } });
});

afterAll(async () => {
    if (!db) return;
    // Only rows created here are removed; shared tables are never truncated.
    if (created.users.length) {
        await db.delete(certificates).where(inArray(certificates.userId, created.users));
        await db.delete(enrollments).where(inArray(enrollments.userId, created.users));
    }
    if (created.courses.length) await db.delete(courses).where(inArray(courses.id, created.courses));
    if (created.users.length) await db.delete(users).where(inArray(users.id, created.users));
    await db.$client.end();
});

describe('admin POST /api/admin/enrollments on real MySQL', () => {
    it('grants one enrollment with no progress and records who granted it', async () => {
        const { userId, courseId } = await seedLearnerAndCourse();

        const res = await grant(userId, courseId);

        expect(res.status).toBe(201);
        const { enrollmentId } = await res.json();
        const rows = await enrollmentRows(userId, courseId);
        expect(rows).toHaveLength(1);
        expect(rows[0]).toMatchObject({ id: enrollmentId, progressPercent: 0, completedAt: null });
        expect(mocks.logAudit).toHaveBeenCalledWith(expect.objectContaining({
            userId: 'admin-integration', action: 'create', entityType: 'enrollment', entityId: enrollmentId,
        }));
    });

    it('rejects a second grant for the same learner and course', async () => {
        const { userId, courseId } = await seedLearnerAndCourse();
        await grant(userId, courseId);

        const res = await grant(userId, courseId);

        expect(res.status).toBe(400);
        expect(await enrollmentRows(userId, courseId)).toHaveLength(1);
    });

    it('keeps one row when two grants race; the loser gets a 500 (KNOWN BEHAVIOR: unique index, no duplicate mapping)', async () => {
        const { userId, courseId } = await seedLearnerAndCourse();

        const statuses = (await Promise.all([grant(userId, courseId), grant(userId, courseId)]))
            .map((res) => res.status)
            .sort();

        expect(await enrollmentRows(userId, courseId)).toHaveLength(1);
        // If both requests pass the existence check, uq_enrollment_user_course rejects the second
        // insert and the route reports it as a server error instead of "already enrolled".
        expect([[201, 400], [201, 500]]).toContainEqual(statuses);
    });

    it('answers 500 for a learner that does not exist (KNOWN BEHAVIOR: the foreign key rejects it, not a 404)', async () => {
        const { courseId } = await seedLearnerAndCourse();

        const res = await grant(id('missing-user'), courseId);

        expect(res.status).toBe(500);
        expect(mocks.logError).toHaveBeenCalledWith(expect.any(Error), { action: 'admin.enrollments.create_failed' });
    });
});

describe('admin POST /api/admin/users/[id]/enrollments on real MySQL', () => {
    it('grants one enrollment without writing an audit entry (KNOWN DEFECT: the other grant route audits)', async () => {
        const { userId, courseId } = await seedLearnerAndCourse();

        const res = await grantFromUserPage(userId, courseId);

        expect(res.status).toBe(200);
        expect(await enrollmentRows(userId, courseId)).toHaveLength(1);
        expect(mocks.logAudit).not.toHaveBeenCalled();
    });

    it('rejects a duplicate and answers 404 for an unknown learner or course', async () => {
        const { userId, courseId } = await seedLearnerAndCourse();
        await grantFromUserPage(userId, courseId);

        expect((await grantFromUserPage(userId, courseId)).status).toBe(400);
        expect((await grantFromUserPage(id('missing-user'), courseId)).status).toBe(404);
        expect((await grantFromUserPage(userId, id('missing-course'))).status).toBe(404);
        expect(await enrollmentRows(userId, courseId)).toHaveLength(1);
    });
});

describe('admin POST /api/admin/certificates on real MySQL', () => {
    it('issues a certificate without an enrollment (explicit admin intent) and returns it on repeat', async () => {
        const { userId, courseId } = await seedLearnerAndCourse();

        const first = await issue(userId, courseId);
        const second = await issue(userId, courseId);

        expect(first.status).toBe(201);
        expect(second.status).toBe(200);
        const [a, b] = [await first.json(), await second.json()];
        expect(a.isNew).toBe(true);
        expect(b).toMatchObject({ isNew: false, certificate: { id: a.certificate.id } });
        expect(await certificateRows(userId, courseId)).toHaveLength(1);
        expect(await enrollmentRows(userId, courseId)).toHaveLength(0);
    });

    it('issues one certificate when two admin requests race', async () => {
        const { userId, courseId } = await seedLearnerAndCourse();

        const statuses = (await Promise.all([issue(userId, courseId), issue(userId, courseId)]))
            .map((res) => res.status)
            .sort();

        expect(statuses).toEqual([200, 201]);
        expect(await certificateRows(userId, courseId)).toHaveLength(1);
    });

    it('does not reissue a revoked certificate and reports it as existing (KNOWN BEHAVIOR)', async () => {
        const { userId, courseId } = await seedLearnerAndCourse();
        const { certificate } = await (await issue(userId, courseId)).json();
        await db.update(certificates).set({ revokedAt: new Date() }).where(eq(certificates.id, certificate.id));

        const res = await issue(userId, courseId);

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body).toMatchObject({ isNew: false, certificate: { id: certificate.id } });
        expect(body.certificate.revokedAt).not.toBeNull();
        expect(await certificateRows(userId, courseId)).toHaveLength(1);
    });

    it('answers 500 for a learner that does not exist (KNOWN BEHAVIOR: not a 404)', async () => {
        const { courseId } = await seedLearnerAndCourse();

        const res = await issue(id('missing-user'), courseId);

        expect(res.status).toBe(500);
        expect(mocks.logError).toHaveBeenCalledWith(expect.any(Error), { action: 'admin.certificates.issue_failed' });
    });
});

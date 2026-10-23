import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { randomBytes } from 'node:crypto';
import { and, eq, inArray, or, sql } from 'drizzle-orm';
import type Stripe from 'stripe';
import {
    auditLogs, bundleCourses, bundles, courses, enrollments, lessonProgress, lessons, payments, users,
} from '@/lib/db/schema';

/**
 * An admin revocation (ถอนสิทธิ์) lasts until an admin restores it. It used to delete the enrollment,
 * and a learner holding a completed payment could insert it again through POST /api/enroll,
 * POST /api/bundles/enroll or the Stripe payment-success page. Revocation now keeps the row and
 * the learner's progress with revoked_at set, and every one of those paths leaves it revoked.
 */

const mocks = vi.hoisted(() => ({
    auth: vi.fn(),
    logError: vi.fn(),
    retrieve: vi.fn(),
}));
vi.mock('@/lib/auth', () => ({ auth: mocks.auth }));
vi.mock('@/lib/auditLog', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/auditLog')>()),
    logAudit: vi.fn().mockResolvedValue(undefined),
    getAuditContext: vi.fn().mockResolvedValue({ ipAddress: null, userAgent: null }),
}));
vi.mock('@/lib/error-handler', () => ({ logError: mocks.logError, logEvent: vi.fn() }));
vi.mock('@/lib/notifications/email', () => ({
    sendEnrollmentEmail: vi.fn().mockResolvedValue(undefined),
    sendPaymentConfirmation: vi.fn().mockResolvedValue(undefined),
    sendCertificateEmail: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/lib/commerce/stripe', () => ({
    stripe: { checkout: { sessions: { retrieve: mocks.retrieve } } },
}));

let db: typeof import('@/lib/db').db;
let revokeRoute: typeof import('@/app/api/admin/enrollments/[id]/route');
let grantRoute: typeof import('@/app/api/admin/enrollments/route');
let paymentRoute: typeof import('@/app/api/admin/payments/[id]/route');
let enrollRoute: typeof import('@/app/api/enroll/route');
let freeEnrollRoute: typeof import('@/app/api/enrollments/route');
let checkRoute: typeof import('@/app/api/enrollments/check/route');
let bundleEnrollRoute: typeof import('@/app/api/bundles/enroll/route');
let intentsRoute: typeof import('@/app/api/promptpay/intents/route');
let fulfillStripe: typeof import('@/lib/commerce/payment-fulfillment').fulfillStripeCheckoutSession;
let loadPaymentReturn: typeof import('@/lib/commerce/payment-return').loadPaymentReturn;
let loadOrderReview: typeof import('@/lib/commerce/order-review').loadOrderReview;
let workspace: typeof import('@/lib/learning/workspace').getLearningWorkspaceProjection;
let updateProgress: typeof import('@/lib/learning/progress').updateLearningProgress;

const suffix = randomBytes(6).toString('hex');
let counter = 0;
const id = (kind: string) => `rv-${suffix}-${kind}-${counter++}`;
const created = {
    users: [] as string[], courses: [] as string[], bundles: [] as string[], payments: [] as string[],
};
let adminId = '';

const asAdmin = () => mocks.auth.mockResolvedValue({ user: { id: adminId, role: 'admin' } });
const asLearner = (userId: string) =>
    mocks.auth.mockResolvedValue({ user: { id: userId, role: 'student', email: `${userId}@example.test`, name: 'Learner' } });
const json = (method: string, body: unknown) => ({
    method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});

async function seedLearner() {
    const userId = id('u');
    await db.insert(users).values({ id: userId, email: `${userId}@example.test`, name: 'Learner', role: 'student' });
    created.users.push(userId);
    return userId;
}

/** A published course with two lessons, so finishing one does not complete it. */
async function seedCourse(price = '990.00') {
    const courseId = id('c');
    const slug = `course-${courseId}`;
    await db.insert(courses).values({ id: courseId, title: `Course ${courseId}`, slug, price, status: 'published' });
    created.courses.push(courseId);
    const [firstLesson, secondLesson] = [id('l'), id('l')];
    await db.insert(lessons).values([
        { id: firstLesson, courseId, title: 'One', orderIndex: 0 },
        { id: secondLesson, courseId, title: 'Two', orderIndex: 1 },
    ]);
    return { courseId, slug, lessonId: firstLesson };
}

async function seedBundle(courseIds: string[]) {
    const bundleId = id('b');
    await db.insert(bundles).values({
        id: bundleId, title: `Bundle ${bundleId}`, slug: `bundle-${bundleId}`, price: '1490.00', status: 'published',
    });
    created.bundles.push(bundleId);
    await db.insert(bundleCourses).values(courseIds.map((courseId, orderIndex) => ({ id: id('bc'), bundleId, courseId, orderIndex })));
    return bundleId;
}

async function seedPayment(userId: string, target: { courseId?: string; bundleId?: string }, method: 'promptpay' | 'stripe' = 'promptpay') {
    const paymentId = id('p');
    await db.insert(payments).values({
        id: paymentId, userId, courseId: target.courseId ?? null, bundleId: target.bundleId ?? null,
        amount: target.bundleId ? '1490.00' : '990.00', currency: 'THB', method, status: 'pending',
    });
    created.payments.push(paymentId);
    return paymentId;
}

const setPaymentStatus = (paymentId: string, status: 'completed' | 'refunded') => {
    asAdmin();
    return paymentRoute.PUT(
        new Request(`http://localhost/api/admin/payments/${paymentId}`, json('PUT', { status, reason: 'integration test' })),
        { params: Promise.resolve({ id: paymentId }) },
    );
};

/** A learner with a course they paid for, approved by an admin, so a completed payment backs it. */
async function paidLearner() {
    const userId = await seedLearner();
    const course = await seedCourse();
    const paymentId = await seedPayment(userId, { courseId: course.courseId });
    expect((await setPaymentStatus(paymentId, 'completed')).status).toBe(200);
    return { userId, ...course, paymentId };
}

const enrollmentOf = async (userId: string, courseId: string) =>
    db.select().from(enrollments).where(and(eq(enrollments.userId, userId), eq(enrollments.courseId, courseId)));

async function revoke(userId: string, courseId: string) {
    const [row] = await enrollmentOf(userId, courseId);
    asAdmin();
    const res = await revokeRoute.DELETE(
        new Request(`http://localhost/api/admin/enrollments/${row.id}`, { method: 'DELETE' }),
        { params: Promise.resolve({ id: row.id }) },
    );
    expect(res.status).toBe(200);
    return row.id;
}

async function expectStillRevoked(userId: string, courseId: string, enrollmentId: string) {
    const rows = await enrollmentOf(userId, courseId);
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe(enrollmentId);
    expect(rows[0].revokedAt).toBeInstanceOf(Date);
}

const checkEnrolled = async (userId: string, courseId: string) => {
    asLearner(userId);
    const res = await checkRoute.GET(new Request(`http://localhost/api/enrollments/check?courseId=${courseId}`));
    return (await res.json()).enrolled as boolean;
};

beforeAll(async () => {
    // Deliberately refuse owner databases and non-loopback connections.
    const target = new URL(process.env.DATABASE_URL ?? 'invalid');
    if (target.protocol !== 'mysql:' || target.hostname !== '127.0.0.1' || target.pathname !== '/milerdev_e2e') {
        throw new Error('Enrollment revocation integration tests require the dedicated loopback milerdev_e2e database');
    }
    ({ db } = await import('@/lib/db'));
    revokeRoute = await import('@/app/api/admin/enrollments/[id]/route');
    grantRoute = await import('@/app/api/admin/enrollments/route');
    paymentRoute = await import('@/app/api/admin/payments/[id]/route');
    enrollRoute = await import('@/app/api/enroll/route');
    freeEnrollRoute = await import('@/app/api/enrollments/route');
    checkRoute = await import('@/app/api/enrollments/check/route');
    bundleEnrollRoute = await import('@/app/api/bundles/enroll/route');
    intentsRoute = await import('@/app/api/promptpay/intents/route');
    ({ fulfillStripeCheckoutSession: fulfillStripe } = await import('@/lib/commerce/payment-fulfillment'));
    ({ loadPaymentReturn } = await import('@/lib/commerce/payment-return'));
    ({ loadOrderReview } = await import('@/lib/commerce/order-review'));
    ({ getLearningWorkspaceProjection: workspace } = await import('@/lib/learning/workspace'));
    ({ updateLearningProgress: updateProgress } = await import('@/lib/learning/progress'));
    await db.execute(sql`SELECT 1`);

    // A real admin: the payment route writes audit rows that reference it.
    adminId = id('admin');
    await db.insert(users).values({ id: adminId, email: `${adminId}@example.test`, name: 'Admin', role: 'admin' });
    created.users.push(adminId);
});

beforeEach(() => {
    vi.clearAllMocks();
});

afterAll(async () => {
    if (!db) return;
    // Only rows created here are removed; shared tables are never truncated.
    await db.delete(auditLogs).where(or(
        inArray(auditLogs.entityId, [...created.payments, 'none']),
        eq(auditLogs.userId, adminId),
    ));
    if (created.users.length) {
        await db.delete(lessonProgress).where(inArray(lessonProgress.userId, created.users));
        await db.delete(enrollments).where(inArray(enrollments.userId, created.users));
        // Includes any payment a test failed to refuse; grant rows cascade with their payments.
        await db.delete(payments).where(inArray(payments.userId, created.users));
    }
    if (created.bundles.length) {
        await db.delete(bundleCourses).where(inArray(bundleCourses.bundleId, created.bundles));
        await db.delete(bundles).where(inArray(bundles.id, created.bundles));
    }
    if (created.courses.length) {
        await db.delete(lessons).where(inArray(lessons.courseId, created.courses));
        await db.delete(courses).where(inArray(courses.id, created.courses));
    }
    if (created.users.length) await db.delete(users).where(inArray(users.id, created.users));
    await db.$client.end();
});

describe('admin revocation on real MySQL', () => {
    it('keeps the enrollment and the progress, and closes the course to the learner', async () => {
        const { userId, courseId, slug, lessonId } = await paidLearner();
        expect((await updateProgress({ userId, lessonId, completed: true })).status).toBe('saved');
        const [before] = await enrollmentOf(userId, courseId);

        const enrollmentId = await revoke(userId, courseId);

        await expectStillRevoked(userId, courseId, enrollmentId);
        const [after] = await enrollmentOf(userId, courseId);
        expect(after.progressPercent).toBe(before.progressPercent);
        expect(after.progressPercent).toBe(50);
        const progress = await db.select().from(lessonProgress)
            .where(and(eq(lessonProgress.userId, userId), eq(lessonProgress.lessonId, lessonId)));
        expect(progress).toMatchObject([{ completed: true }]);

        expect(await workspace({ memberId: userId, courseSlug: slug, lessonId })).toMatchObject({ kind: 'access_denied' });
        expect(await updateProgress({ userId, lessonId, completed: false })).toEqual({ status: 'forbidden' });
        expect(await checkEnrolled(userId, courseId)).toBe(false);
    });

    it('a completed course payment does not restore it through POST /api/enroll', async () => {
        const { userId, courseId, paymentId } = await paidLearner();
        const enrollmentId = await revoke(userId, courseId);

        asLearner(userId);
        const res = await enrollRoute.POST(new Request('http://localhost/api/enroll', json('POST', { courseId, paymentId })));

        expect(res.status).toBe(403);
        await expectStillRevoked(userId, courseId, enrollmentId);
    });

    it('a completed bundle payment does not restore it through POST /api/bundles/enroll', async () => {
        const userId = await seedLearner();
        const revoked = await seedCourse();
        const kept = await seedCourse();
        const bundleId = await seedBundle([revoked.courseId, kept.courseId]);
        const paymentId = await seedPayment(userId, { bundleId });
        expect((await setPaymentStatus(paymentId, 'completed')).status).toBe(200);
        const enrollmentId = await revoke(userId, revoked.courseId);

        asLearner(userId);
        await bundleEnrollRoute.POST(new Request('http://localhost/api/bundles/enroll', json('POST', { bundleId, paymentId })));

        await expectStillRevoked(userId, revoked.courseId, enrollmentId);
        expect((await enrollmentOf(userId, kept.courseId))[0].revokedAt).toBeNull();
    });

    it('a Stripe payment-success replay does not restore it, and says access was withdrawn', async () => {
        const userId = await seedLearner();
        const { courseId, slug } = await seedCourse();
        const paymentId = await seedPayment(userId, { courseId }, 'stripe');
        const session = {
            id: `cs_${suffix}_${paymentId}`.replace(/[^a-zA-Z0-9_-]/g, '_'),
            payment_status: 'paid', amount_total: 99000, currency: 'thb', payment_intent: `pi_${suffix}_${paymentId}`,
            metadata: { paymentId, userId, type: 'course', courseId },
        } as unknown as Stripe.Checkout.Session;
        expect((await fulfillStripe({ session })).status).toBe('fulfilled');
        const enrollmentId = await revoke(userId, courseId);
        mocks.retrieve.mockResolvedValue(session);

        const record = await loadPaymentReturn(userId, 'course', slug, session.id);

        await expectStillRevoked(userId, courseId, enrollmentId);
        expect(record?.presentation.payment.state).not.toBe('completed-ready');
        expect(record?.presentation.payment.label).toBe('ชำระแล้ว · สิทธิ์ถูกระงับ');
        expect(record?.presentation.recovery.kind).toBe('contact');
    });

    it('a free course cannot be enrolled in again', async () => {
        const userId = await seedLearner();
        const { courseId } = await seedCourse('0.00');
        asLearner(userId);
        const enroll = () => freeEnrollRoute.POST(new Request('http://localhost/api/enrollments', json('POST', { courseId })));
        expect((await enroll()).status).toBe(201);
        const enrollmentId = await revoke(userId, courseId);

        asLearner(userId);
        const res = await enroll();

        expect(res.status).toBe(403);
        await expectStillRevoked(userId, courseId, enrollmentId);
    });

    it('checkout takes no new payment for the course or for a bundle that contains it', async () => {
        const { userId, courseId } = await paidLearner();
        const other = await seedCourse();
        const bundleId = await seedBundle([courseId, other.courseId]);
        await revoke(userId, courseId);
        const paymentsBefore = await db.select({ id: payments.id }).from(payments).where(eq(payments.userId, userId));

        await expect(loadOrderReview(userId, { courseId })).rejects.toMatchObject({ status: 403 });
        await expect(loadOrderReview(userId, { bundleId })).rejects.toMatchObject({ status: 403 });
        asLearner(userId);
        const courseIntent = await intentsRoute.POST(new Request('http://localhost/api/promptpay/intents', json('POST', { courseId })));
        const bundleIntent = await intentsRoute.POST(new Request('http://localhost/api/promptpay/intents', json('POST', { bundleId })));

        expect(courseIntent.status).toBe(403);
        expect(bundleIntent.status).toBe(403);
        expect(await db.select({ id: payments.id }).from(payments).where(eq(payments.userId, userId))).toEqual(paymentsBefore);
    });

    it('refunding the payment keeps the revoked row, so no other grant can replace it', async () => {
        const { userId, courseId, paymentId } = await paidLearner();
        const enrollmentId = await revoke(userId, courseId);

        expect((await setPaymentStatus(paymentId, 'refunded')).status).toBe(200);

        await expectStillRevoked(userId, courseId, enrollmentId);
    });

    it('an admin grant restores the same enrollment with its progress', async () => {
        const { userId, courseId, slug, lessonId } = await paidLearner();
        expect((await updateProgress({ userId, lessonId, completed: true })).status).toBe('saved');
        const enrollmentId = await revoke(userId, courseId);

        asAdmin();
        const res = await grantRoute.POST(new Request('http://localhost/api/admin/enrollments', json('POST', { userId, courseId })));

        expect(res.status).toBe(200);
        expect(await res.json()).toMatchObject({ enrollmentId, restored: true });
        const rows = await enrollmentOf(userId, courseId);
        expect(rows).toHaveLength(1);
        expect(rows[0]).toMatchObject({ id: enrollmentId, revokedAt: null, progressPercent: 50 });
        expect(await workspace({ memberId: userId, courseSlug: slug, lessonId })).toMatchObject({ kind: 'ready' });
        expect(await checkEnrolled(userId, courseId)).toBe(true);
    });
});

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { randomBytes } from 'node:crypto';
import { eq, inArray, sql } from 'drizzle-orm';
import type { PoolConnection } from 'mysql2/promise';
import type Stripe from 'stripe';
import {
    bundleCourses, bundles, courses, enrollments, paymentCourseGrants, payments, users,
} from '@/lib/db/schema';

/**
 * A grant path racing an admin refund on real MySQL. The refund runs on a raw connection and is
 * held open after it marks the payment refunded and deletes the enrollments. A grant path must
 * wait on the payment row lock, see 'refunded' once the refund commits, and grant nothing.
 * Before the fix, both paths read the payment without a lock and re-created the enrollments.
 */

const mocks = vi.hoisted(() => ({ auth: vi.fn() }));
vi.mock('@/lib/auth', () => ({ auth: mocks.auth }));
vi.mock('@/lib/error-handler', () => ({ logError: vi.fn() }));
vi.mock('@/lib/notifications/email', () => ({ sendEnrollmentEmail: vi.fn().mockResolvedValue(undefined) }));

let db: typeof import('@/lib/db').db;
let fulfillStripe: typeof import('@/lib/commerce/payment-fulfillment').fulfillStripeCheckoutSession;
let enrollRoute: typeof import('@/app/api/bundles/enroll/route');
let openRaw: PoolConnection | null = null;

const suffix = randomBytes(6).toString('hex');
let counter = 0;
const id = (kind: string) => `rr-${suffix}-${kind}-${counter++}`;
const created = { users: [] as string[], courses: [] as string[], bundles: [] as string[], payments: [] as string[] };

async function seedStudent() {
    const studentId = id('u');
    await db.insert(users).values({ id: studentId, email: `${studentId}@example.test`, name: 'Learner', role: 'student' });
    created.users.push(studentId);
    return studentId;
}

async function seedCourse() {
    const courseId = id('c');
    await db.insert(courses).values({
        id: courseId, title: `Course ${courseId}`, slug: `course-${courseId}`, price: '100.00', status: 'published',
    });
    created.courses.push(courseId);
    return courseId;
}

/** A completed Stripe course purchase with its enrollment. */
async function stripeCoursePurchase() {
    const studentId = await seedStudent();
    const courseId = await seedCourse();
    const paymentId = id('p');
    const paymentIntent = `pi_${suffix}_${paymentId}`;
    await db.insert(payments).values({
        id: paymentId, userId: studentId, courseId, amount: '100.00', currency: 'THB',
        method: 'stripe', status: 'completed', stripePaymentId: paymentIntent,
    });
    created.payments.push(paymentId);
    await db.insert(enrollments).values({ userId: studentId, courseId });
    const session = {
        payment_status: 'paid', amount_total: 10000, currency: 'thb', payment_intent: paymentIntent,
        metadata: { paymentId, userId: studentId, type: 'course', courseId },
    } as unknown as Stripe.Checkout.Session;
    return { studentId, courseIds: [courseId], paymentId, session };
}

/** A completed PromptPay bundle purchase {A, B} with both enrollments. */
async function bundlePurchase() {
    const studentId = await seedStudent();
    const courseIds = [await seedCourse(), await seedCourse()];
    const bundleId = id('b');
    await db.insert(bundles).values({ id: bundleId, title: `Bundle ${bundleId}`, slug: `bundle-${bundleId}`, price: '150.00', status: 'published' });
    created.bundles.push(bundleId);
    await db.insert(bundleCourses).values(courseIds.map((courseId, orderIndex) => ({ bundleId, courseId, orderIndex })));
    const paymentId = id('p');
    await db.insert(payments).values({
        id: paymentId, userId: studentId, bundleId, amount: '150.00', currency: 'THB', method: 'promptpay', status: 'completed',
    });
    created.payments.push(paymentId);
    await db.insert(enrollments).values(courseIds.map((courseId) => ({ userId: studentId, courseId })));
    return { studentId, courseIds, bundleId, paymentId };
}

const enrollRequest = (bundleId: string, paymentId: string) => enrollRoute.POST(new Request('http://localhost/api/bundles/enroll', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bundleId, paymentId }),
}));

const enrollmentCount = async (userId: string) =>
    (await db.select().from(enrollments).where(eq(enrollments.userId, userId))).length;
const paymentStatus = async (paymentId: string) =>
    (await db.select({ status: payments.status }).from(payments).where(eq(payments.id, paymentId)))[0]?.status;

/** Starts an admin refund on a raw connection and leaves it uncommitted, holding its locks. */
async function holdRefund(paymentId: string, userId: string, courseIds: string[]) {
    const raw = await db.$client.getConnection();
    openRaw = raw;
    await raw.query('BEGIN');
    const [update] = await raw.query("UPDATE payments SET status = 'refunded' WHERE id = ? AND status = 'completed'", [paymentId]);
    expect((update as { affectedRows: number }).affectedRows).toBe(1);
    await raw.query('DELETE FROM enrollments WHERE user_id = ? AND course_id IN (?)', [userId, courseIds]);
    return async () => {
        await raw.query('COMMIT');
        openRaw = null;
        raw.release();
    };
}

/** Whether a promise is still pending after a bounded wait: the grant is blocked on the lock. */
async function stillPendingAfter<T>(promise: Promise<T>, ms: number) {
    let settled = false;
    promise.then(() => { settled = true; }, () => { settled = true; });
    await new Promise((resolve) => setTimeout(resolve, ms));
    return !settled;
}

beforeAll(async () => {
    // Deliberately refuse owner databases and non-loopback connections.
    const target = new URL(process.env.DATABASE_URL ?? 'invalid');
    if (target.protocol !== 'mysql:' || target.hostname !== '127.0.0.1' || target.pathname !== '/milerdev_e2e') {
        throw new Error('Refund race integration tests require the dedicated loopback milerdev_e2e database');
    }
    ({ db } = await import('@/lib/db'));
    ({ fulfillStripeCheckoutSession: fulfillStripe } = await import('@/lib/commerce/payment-fulfillment'));
    enrollRoute = await import('@/app/api/bundles/enroll/route');
    await db.execute(sql`SELECT 1`);
});

beforeEach(() => {
    vi.clearAllMocks();
});

afterEach(async () => {
    // Never leave a raw transaction holding locks on the shared database.
    if (openRaw) {
        const raw = openRaw;
        openRaw = null;
        await raw.query('ROLLBACK').catch(() => {});
        raw.release();
    }
});

afterAll(async () => {
    if (!db) return;
    // Only rows created here are removed; payment_course_grants rows cascade with their payments.
    if (created.users.length) await db.delete(enrollments).where(inArray(enrollments.userId, created.users));
    if (created.payments.length) await db.delete(payments).where(inArray(payments.id, created.payments));
    if (created.bundles.length) {
        await db.delete(bundleCourses).where(inArray(bundleCourses.bundleId, created.bundles));
        await db.delete(bundles).where(inArray(bundles.id, created.bundles));
    }
    if (created.courses.length) await db.delete(courses).where(inArray(courses.id, created.courses));
    if (created.users.length) await db.delete(users).where(inArray(users.id, created.users));
    await db.$client.end();
});

describe('Stripe fulfillment replay racing an admin refund', () => {
    it.each([1, 2, 3])('waits for the refund and grants nothing (run %i)', async () => {
        const purchase = await stripeCoursePurchase();
        const commitRefund = await holdRefund(purchase.paymentId, purchase.studentId, purchase.courseIds);

        const replay = fulfillStripe({ session: purchase.session });
        expect(await stillPendingAfter(replay, 300)).toBe(true);
        await commitRefund();

        expect(await replay).toMatchObject({ status: 'rejected', code: 'PAYMENT_STATUS_REFUNDED' });
        expect(await paymentStatus(purchase.paymentId)).toBe('refunded');
        expect(await enrollmentCount(purchase.studentId)).toBe(0);
    });
});

describe('POST /api/bundles/enroll racing an admin refund', () => {
    it.each([1, 2, 3])('waits for the refund and grants nothing (run %i)', async () => {
        const purchase = await bundlePurchase();
        mocks.auth.mockResolvedValue({ user: { id: purchase.studentId, role: 'student' } });
        const commitRefund = await holdRefund(purchase.paymentId, purchase.studentId, purchase.courseIds);

        const grant = enrollRequest(purchase.bundleId, purchase.paymentId);
        expect(await stillPendingAfter(grant, 300)).toBe(true);
        await commitRefund();

        expect((await grant).status).toBe(402);
        expect(await paymentStatus(purchase.paymentId)).toBe('refunded');
        expect(await enrollmentCount(purchase.studentId)).toBe(0);
        expect(await db.select().from(paymentCourseGrants).where(eq(paymentCourseGrants.paymentId, purchase.paymentId))).toEqual([]);
    });

    it('still re-grants a completed bundle payment and records what it granted', async () => {
        const purchase = await bundlePurchase();
        await db.delete(enrollments).where(eq(enrollments.userId, purchase.studentId));
        mocks.auth.mockResolvedValue({ user: { id: purchase.studentId, role: 'student' } });

        const res = await enrollRequest(purchase.bundleId, purchase.paymentId);

        expect(res.status).toBe(201);
        expect(await res.json()).toMatchObject({ totalEnrolled: 2, totalSkipped: 0 });
        expect(await enrollmentCount(purchase.studentId)).toBe(2);
        const grants = await db.select({ courseId: paymentCourseGrants.courseId }).from(paymentCourseGrants)
            .where(eq(paymentCourseGrants.paymentId, purchase.paymentId));
        expect(grants.map((row) => row.courseId).sort()).toEqual([...purchase.courseIds].sort());
    });
});

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { randomBytes } from 'node:crypto';
import { and, eq, inArray, or, sql } from 'drizzle-orm';
import type Stripe from 'stripe';
import {
    auditLogs, bundleCourses, bundles, courses, enrollments, paymentCourseGrants, payments, users,
} from '@/lib/db/schema';

/**
 * A bundle refund revokes the courses the payment granted, recorded in payment_course_grants on
 * every bundle grant path, not only the bundle's membership at refund time. Membership can change
 * after a sale, and a deleted bundle leaves the payment with no bundle at all.
 */

const mocks = vi.hoisted(() => ({
    auth: vi.fn(),
    logError: vi.fn(),
}));
vi.mock('@/lib/auth', () => ({ auth: mocks.auth }));
vi.mock('@/lib/auditLog', async (importOriginal) => ({
    // createAuditLogValues stays real: updateBundleWithIntegrity writes its audit row in-transaction.
    ...(await importOriginal<typeof import('@/lib/auditLog')>()),
    logAudit: vi.fn().mockResolvedValue(undefined),
    getAuditContext: vi.fn().mockResolvedValue({ ipAddress: null, userAgent: null }),
}));
vi.mock('@/lib/error-handler', () => ({ logError: mocks.logError }));
vi.mock('@/lib/notifications/email', () => ({
    sendEnrollmentEmail: vi.fn().mockResolvedValue(undefined),
    sendPaymentConfirmation: vi.fn().mockResolvedValue(undefined),
}));

let db: typeof import('@/lib/db').db;
let paymentRoute: typeof import('@/app/api/admin/payments/[id]/route');
let updateBundleWithIntegrity: typeof import('@/lib/commerce/bundle-mutation').updateBundleWithIntegrity;
let fulfillStripe: typeof import('@/lib/commerce/payment-fulfillment').fulfillStripeCheckoutSession;
let fulfillPromptPay: typeof import('@/lib/commerce/promptpay-fulfillment').fulfillPromptPayIntent;

const suffix = randomBytes(6).toString('hex');
let counter = 0;
const id = (kind: string) => `bg-${suffix}-${kind}-${counter++}`;
const created = {
    users: [] as string[], courses: [] as string[], bundles: [] as string[], payments: [] as string[],
};
let adminId = '';

async function seedStudent() {
    const studentId = id('u');
    await db.insert(users).values({ id: studentId, email: `${studentId}@example.test`, name: 'Learner', role: 'student' });
    created.users.push(studentId);
    return studentId;
}

async function seedCourse(label: string) {
    const courseId = id(label);
    await db.insert(courses).values({
        id: courseId, title: `Course ${courseId}`, slug: `course-${courseId}`, price: '990.00', status: 'published',
    });
    created.courses.push(courseId);
    return courseId;
}

async function seedBundle(courseIds: string[]) {
    const bundleId = id('b');
    await db.insert(bundles).values({
        id: bundleId, title: `Bundle ${bundleId}`, slug: `bundle-${bundleId}`, price: '1990.00', status: 'published',
    });
    created.bundles.push(bundleId);
    await db.insert(bundleCourses).values(courseIds.map((courseId, orderIndex) => ({
        id: id('bc'), bundleId, courseId, orderIndex,
    })));
    return bundleId;
}

async function seedBundlePayment(userId: string, bundleId: string, method: 'promptpay' | 'stripe', status: 'pending' | 'verifying') {
    const paymentId = id('p');
    await db.insert(payments).values({
        id: paymentId, userId, bundleId, courseId: null, amount: '1990.00', currency: 'THB', method, status,
    });
    created.payments.push(paymentId);
    return paymentId;
}

const putStatus = (paymentId: string, body: { status: string; reason: string }) =>
    paymentRoute.PUT(
        new Request(`http://localhost/api/admin/payments/${paymentId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        }),
        { params: Promise.resolve({ id: paymentId }) },
    );
const approve = async (paymentId: string) => {
    const res = await putStatus(paymentId, { status: 'completed', reason: 'slip checked by admin' });
    expect(res.status).toBe(200);
};
const refund = (paymentId: string) => putStatus(paymentId, { status: 'refunded', reason: 'test refund' });

const isEnrolled = async (userId: string, courseId: string) =>
    (await db.select().from(enrollments).where(and(eq(enrollments.userId, userId), eq(enrollments.courseId, courseId)))).length === 1;
const grants = async (paymentId: string) =>
    (await db.select({ courseId: paymentCourseGrants.courseId }).from(paymentCourseGrants)
        .where(eq(paymentCourseGrants.paymentId, paymentId))).map((row) => row.courseId).sort();

async function setMembership(bundleId: string, courseIds: string[]) {
    await updateBundleWithIntegrity({
        actorId: adminId,
        bundleId,
        input: {
            title: `Bundle ${bundleId}`, slug: `bundle-${bundleId}`, description: null, thumbnailUrl: null,
            price: '1990.00', status: 'published', courseIds,
        },
        auditContext: { ipAddress: null, userAgent: null },
    });
}

/** A student buys bundle {A, X} and the admin approves it, so the payment grants both courses. */
async function approvedBundlePurchase() {
    const studentId = await seedStudent();
    const courseA = await seedCourse('a');
    const courseX = await seedCourse('x');
    const bundleId = await seedBundle([courseA, courseX]);
    const paymentId = await seedBundlePayment(studentId, bundleId, 'promptpay', 'pending');
    await approve(paymentId);
    return { studentId, courseA, courseX, bundleId, paymentId };
}

beforeAll(async () => {
    // Deliberately refuse owner databases and non-loopback connections.
    const target = new URL(process.env.DATABASE_URL ?? 'invalid');
    if (target.protocol !== 'mysql:' || target.hostname !== '127.0.0.1' || target.pathname !== '/milerdev_e2e') {
        throw new Error('Bundle refund integration tests require the dedicated loopback milerdev_e2e database');
    }
    ({ db } = await import('@/lib/db'));
    paymentRoute = await import('@/app/api/admin/payments/[id]/route');
    ({ updateBundleWithIntegrity } = await import('@/lib/commerce/bundle-mutation'));
    ({ fulfillStripeCheckoutSession: fulfillStripe } = await import('@/lib/commerce/payment-fulfillment'));
    ({ fulfillPromptPayIntent: fulfillPromptPay } = await import('@/lib/commerce/promptpay-fulfillment'));
    await db.execute(sql`SELECT 1`);

    // A real active admin: the bundle edit locks this row and the audit rows reference it.
    adminId = id('admin');
    await db.insert(users).values({ id: adminId, email: `${adminId}@example.test`, name: 'Admin', role: 'admin' });
    created.users.push(adminId);
});

beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ user: { id: adminId, role: 'admin' } });
});

afterAll(async () => {
    if (!db) return;
    // Only rows created here are removed; shared tables are never truncated.
    await db.delete(auditLogs).where(or(
        inArray(auditLogs.entityId, [...created.payments, ...created.bundles, 'none']),
        eq(auditLogs.userId, adminId),
    ));
    if (created.users.length) await db.delete(enrollments).where(inArray(enrollments.userId, created.users));
    // payment_course_grants rows cascade with their payments.
    if (created.payments.length) await db.delete(payments).where(inArray(payments.id, created.payments));
    if (created.bundles.length) {
        await db.delete(bundleCourses).where(inArray(bundleCourses.bundleId, created.bundles));
        await db.delete(bundles).where(inArray(bundles.id, created.bundles));
    }
    if (created.courses.length) await db.delete(courses).where(inArray(courses.id, created.courses));
    if (created.users.length) await db.delete(users).where(inArray(users.id, created.users));
    await db.$client.end();
});

describe('bundle grant paths record what the payment granted', () => {
    it('admin approval records each course of the bundle', async () => {
        const { courseA, courseX, paymentId } = await approvedBundlePurchase();

        expect(await grants(paymentId)).toEqual([courseA, courseX].sort());
    });

    it('Stripe fulfillment records each course, and a replay adds no duplicate', async () => {
        const studentId = await seedStudent();
        const courseA = await seedCourse('a');
        const courseB = await seedCourse('b');
        const bundleId = await seedBundle([courseA, courseB]);
        const paymentId = await seedBundlePayment(studentId, bundleId, 'stripe', 'pending');
        const session = {
            payment_status: 'paid', amount_total: 199000, currency: 'thb', payment_intent: `pi_${suffix}_${paymentId}`,
            metadata: { paymentId, userId: studentId, type: 'bundle', bundleId },
        } as unknown as Stripe.Checkout.Session;

        expect((await fulfillStripe({ session })).status).toBe('fulfilled');
        expect((await fulfillStripe({ session })).status).toBe('already_fulfilled');

        expect(await grants(paymentId)).toEqual([courseA, courseB].sort());
    });

    it('PromptPay fulfillment records each course', async () => {
        const studentId = await seedStudent();
        const courseA = await seedCourse('a');
        const courseB = await seedCourse('b');
        const bundleId = await seedBundle([courseA, courseB]);
        const paymentId = await seedBundlePayment(studentId, bundleId, 'promptpay', 'verifying');

        const result = await fulfillPromptPay({ paymentId, userId: studentId, promptpayTransRef: `tr-${suffix}-${paymentId}` });

        expect(result.status).toBe('fulfilled');
        expect(await grants(paymentId)).toEqual([courseA, courseB].sort());
    });
});

describe('admin refund of a bundle payment', () => {
    it('revokes every course of an unchanged bundle', async () => {
        const { studentId, courseA, courseX, paymentId } = await approvedBundlePurchase();

        const res = await refund(paymentId);

        expect(res.status).toBe(200);
        expect(await isEnrolled(studentId, courseA)).toBe(false);
        expect(await isEnrolled(studentId, courseX)).toBe(false);
    });

    it('revokes a course removed from the bundle after the sale', async () => {
        const { studentId, courseA, courseX, bundleId, paymentId } = await approvedBundlePurchase();
        const courseY = await seedCourse('y');
        await setMembership(bundleId, [courseA, courseY]);

        const res = await refund(paymentId);

        expect(res.status).toBe(200);
        expect((await db.select().from(payments).where(eq(payments.id, paymentId)))[0].status).toBe('refunded');
        expect(await isEnrolled(studentId, courseA)).toBe(false);
        expect(await isEnrolled(studentId, courseX)).toBe(false);
        expect(await isEnrolled(studentId, courseY)).toBe(false);
    });

    it('revokes every granted course after the bundle was deleted', async () => {
        const { studentId, courseA, courseX, bundleId, paymentId } = await approvedBundlePurchase();
        // The same statement as DELETE /api/admin/bundles/[id]; payments.bundle_id becomes NULL.
        await db.delete(bundles).where(eq(bundles.id, bundleId));

        const res = await refund(paymentId);

        expect(res.status).toBe(200);
        expect(await isEnrolled(studentId, courseA)).toBe(false);
        expect(await isEnrolled(studentId, courseX)).toBe(false);
    });

    it('keeps a course that another completed payment was recorded as granting', async () => {
        const { studentId, courseA, courseX, paymentId } = await approvedBundlePurchase();
        // A second bundle {X} sold to the same student, then edited so X is no longer a member:
        // only the recorded grant still shows that the second payment paid for X.
        const secondBundle = await seedBundle([courseX]);
        const secondPayment = await seedBundlePayment(studentId, secondBundle, 'promptpay', 'pending');
        await approve(secondPayment);
        // A bundle edit needs at least two courses.
        await setMembership(secondBundle, [await seedCourse('z'), await seedCourse('w')]);

        const res = await refund(paymentId);

        expect(res.status).toBe(200);
        expect(await isEnrolled(studentId, courseA)).toBe(false);
        expect(await isEnrolled(studentId, courseX)).toBe(true);
    });
});

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomBytes } from 'node:crypto';
import { eq, inArray, sql } from 'drizzle-orm';
import {
    bundleCourses, bundles, couponUsages, coupons, courses, enrollments, payments, users,
} from '@/lib/db/schema';

/**
 * Characterization of PromptPay claim and fulfillment on real MySQL (SELECT ... FOR UPDATE,
 * unique slip reference, rollback). Pins CURRENT behavior; KNOWN DEFECT marks behavior that
 * looks wrong and is documented here, not endorsed.
 */

let db: typeof import('@/lib/db').db;
let svc: typeof import('@/lib/commerce/promptpay-fulfillment');
const suffix = randomBytes(6).toString('hex');
let counter = 0;
const created = {
    users: [] as string[], courses: [] as string[], payments: [] as string[],
    bundles: [] as string[], coupons: [] as string[],
};
const id = (kind: string) => `pp-${suffix}-${kind}-${counter++}`;

async function seedUser() {
    const userId = id('u');
    await db.insert(users).values({ id: userId, email: `${userId}@example.test`, name: 'Buyer' });
    created.users.push(userId);
    return userId;
}
async function seedCourse() {
    const courseId = id('c');
    await db.insert(courses).values({ id: courseId, title: 'Course', slug: `course-${courseId}`, price: '100.00', status: 'published' });
    created.courses.push(courseId);
    return courseId;
}
async function seedIntent(over: Partial<typeof payments.$inferInsert> = {}) {
    const userId = over.userId ?? await seedUser();
    const courseId = 'courseId' in over ? over.courseId : await seedCourse();
    const paymentId = id('p');
    await db.insert(payments).values({
        id: paymentId, userId, courseId, amount: '100.00', currency: 'THB', method: 'promptpay', status: 'pending',
        // DATETIME rounds to whole seconds, so "now" can land up to 0.5s in the future and the
        // claim guard would call a brand-new intent expired. Seed a few seconds in the past.
        createdAt: new Date(Date.now() - 5_000), ...over,
    });
    created.payments.push(paymentId);
    return { paymentId, userId, courseId: courseId as string };
}
const statusOf = async (paymentId: string) => (await db.select().from(payments).where(eq(payments.id, paymentId)))[0].status;
const enrolled = (userId: string) => db.select().from(enrollments).where(eq(enrollments.userId, userId));

beforeAll(async () => {
    // Deliberately refuse owner databases and non-loopback connections.
    const target = new URL(process.env.DATABASE_URL ?? 'invalid');
    if (target.protocol !== 'mysql:' || target.hostname !== '127.0.0.1' || target.pathname !== '/milerdev_e2e') {
        throw new Error('PromptPay integration tests require the dedicated loopback milerdev_e2e database');
    }
    ({ db } = await import('@/lib/db'));
    svc = await import('@/lib/commerce/promptpay-fulfillment');
    await db.execute(sql`SELECT 1`);
});

afterAll(async () => {
    if (!db) return;
    // Only rows created here are removed; shared tables are never truncated.
    if (created.coupons.length) {
        await db.delete(couponUsages).where(inArray(couponUsages.couponId, created.coupons));
        await db.delete(coupons).where(inArray(coupons.id, created.coupons));
    }
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

describe('PromptPay claim on real MySQL', () => {
    it('lets exactly one of two concurrent claims win; the other is told it is verifying', async () => {
        const a = await seedIntent();

        const settled = await Promise.allSettled([1, 2].map(() =>
            svc.claimPromptPayIntent({ paymentId: a.paymentId, userId: a.userId, targetType: 'course' })));

        const won = settled.filter((r) => r.status === 'fulfilled');
        const lost = settled.filter((r) => r.status === 'rejected');
        expect(won).toHaveLength(1);
        expect(lost).toHaveLength(1);
        expect((lost[0] as PromiseRejectedResult).reason).toMatchObject({ code: 'PAYMENT_STATUS_VERIFYING' });
        expect(await statusOf(a.paymentId)).toBe('verifying');
    });

    it('refuses an intent owned by someone else and leaves it pending', async () => {
        const a = await seedIntent();
        const other = await seedUser();

        await expect(svc.claimPromptPayIntent({ paymentId: a.paymentId, userId: other, targetType: 'course' }))
            .rejects.toMatchObject({ code: 'PAYMENT_OWNER_MISMATCH' });
        expect(await statusOf(a.paymentId)).toBe('pending');
    });

    it('refuses an expired intent (30 minute window) and leaves it pending', async () => {
        const a = await seedIntent({ createdAt: new Date(Date.now() - 31 * 60 * 1000) });

        await expect(svc.claimPromptPayIntent({ paymentId: a.paymentId, userId: a.userId, targetType: 'course' }))
            .rejects.toMatchObject({ code: 'PAYMENT_INTENT_EXPIRED' });
        expect(await statusOf(a.paymentId)).toBe('pending');
    });

    it('releases a claim back to pending, and only from verifying', async () => {
        const a = await seedIntent();
        await svc.claimPromptPayIntent({ paymentId: a.paymentId, userId: a.userId, targetType: 'course' });

        await svc.releasePromptPayIntent(a.paymentId);
        expect(await statusOf(a.paymentId)).toBe('pending');

        const done = await seedIntent({ status: 'completed' });
        await svc.releasePromptPayIntent(done.paymentId);
        expect(await statusOf(done.paymentId)).toBe('completed');
    });
});

describe('PromptPay fulfillment on real MySQL', () => {
    it('completes a verifying intent, grants one enrollment and stores the slip reference', async () => {
        const a = await seedIntent({ status: 'verifying' });
        const ref = `ref-${suffix}-ok`;

        const result = await svc.fulfillPromptPayIntent({ paymentId: a.paymentId, userId: a.userId, promptpayTransRef: ref });

        expect(result).toMatchObject({ status: 'fulfilled', enrolledCount: 1 });
        const [row] = await db.select().from(payments).where(eq(payments.id, a.paymentId));
        expect(row.status).toBe('completed');
        expect(row.promptpayTransRef).toBe(ref);
        expect(row.slipUrl).toBe(ref); // pinned: the reference is also stored as slipUrl
        expect(await enrolled(a.userId)).toHaveLength(1);
    });

    it('serializes two concurrent fulfillments of one intent: one fulfills, one is already_fulfilled', async () => {
        const a = await seedIntent({ status: 'verifying' });
        const ref = `ref-${suffix}-race`;

        const results = await Promise.all([1, 2].map(() =>
            svc.fulfillPromptPayIntent({ paymentId: a.paymentId, userId: a.userId, promptpayTransRef: ref })));

        expect(results.map((r) => r.status).sort()).toEqual(['already_fulfilled', 'fulfilled']);
        expect(await enrolled(a.userId)).toHaveLength(1);
    });

    it('refuses to fulfil an intent that was never claimed and grants nothing', async () => {
        const a = await seedIntent({ status: 'pending' });

        await expect(svc.fulfillPromptPayIntent({ paymentId: a.paymentId, userId: a.userId, promptpayTransRef: `ref-${suffix}-unclaimed` }))
            .rejects.toThrow('PAYMENT_STATE_RACE');
        expect(await statusOf(a.paymentId)).toBe('pending');
        expect(await enrolled(a.userId)).toHaveLength(0);
    });

    it('rejects a slip reference already used by another payment and rolls the second one back', async () => {
        const first = await seedIntent({ status: 'verifying' });
        const second = await seedIntent({ status: 'verifying' });
        const ref = `ref-${suffix}-dup`;
        await svc.fulfillPromptPayIntent({ paymentId: first.paymentId, userId: first.userId, promptpayTransRef: ref });

        await expect(svc.fulfillPromptPayIntent({ paymentId: second.paymentId, userId: second.userId, promptpayTransRef: ref }))
            .rejects.toThrow();
        expect(await statusOf(second.paymentId)).toBe('verifying');
        expect(await enrolled(second.userId)).toHaveLength(0);
    });

    it('enrolls the buyer in every course of a bundle', async () => {
        const userId = await seedUser();
        const bundleId = id('b');
        const [c1, c2] = [await seedCourse(), await seedCourse()];
        await db.insert(bundles).values({ id: bundleId, title: 'Bundle', slug: `bundle-${bundleId}`, price: '100.00', status: 'published' });
        created.bundles.push(bundleId);
        await db.insert(bundleCourses).values([{ bundleId, courseId: c1 }, { bundleId, courseId: c2 }]);
        const a = await seedIntent({ userId, courseId: null, bundleId, status: 'verifying' });

        const result = await svc.fulfillPromptPayIntent({ paymentId: a.paymentId, userId, promptpayTransRef: `ref-${suffix}-bundle` });

        expect(result).toMatchObject({ status: 'fulfilled', enrolledCount: 2 });
        expect((await enrolled(userId)).map((e) => e.courseId).sort()).toEqual([c1, c2].sort());
    });

    it('rolls back a bundle payment whose bundle has no courses', async () => {
        const userId = await seedUser();
        const bundleId = id('b');
        await db.insert(bundles).values({ id: bundleId, title: 'Empty', slug: `bundle-${bundleId}`, price: '100.00', status: 'published' });
        created.bundles.push(bundleId);
        const a = await seedIntent({ userId, courseId: null, bundleId, status: 'verifying' });

        await expect(svc.fulfillPromptPayIntent({ paymentId: a.paymentId, userId, promptpayTransRef: `ref-${suffix}-empty` }))
            .rejects.toThrow('BUNDLE_HAS_NO_COURSES');
        expect(await statusOf(a.paymentId)).toBe('verifying');
    });

    it('records coupon usage with discountAmount 0 (KNOWN DEFECT: real discount not stored)', async () => {
        const couponId = id('k');
        await db.insert(coupons).values({ id: couponId, code: `CODE-${couponId}`, discountType: 'fixed', discountValue: '10.00' });
        created.coupons.push(couponId);
        const a = await seedIntent({ status: 'verifying', couponId });

        await svc.fulfillPromptPayIntent({ paymentId: a.paymentId, userId: a.userId, promptpayTransRef: `ref-${suffix}-coupon` });

        const usages = await db.select().from(couponUsages).where(eq(couponUsages.couponId, couponId));
        expect(usages).toHaveLength(1);
        expect(usages[0].discountAmount).toBe('0.00');
        const [coupon] = await db.select().from(coupons).where(eq(coupons.id, couponId));
        expect(coupon.usageCount).toBe(1);
    });
});

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomBytes } from 'node:crypto';
import { eq, inArray, sql } from 'drizzle-orm';
import type Stripe from 'stripe';
import {
    courses, enrollments, payments, stripeEvents, users,
} from '@/lib/db/schema';

/**
 * Characterization of Stripe fulfillment on real MySQL.
 *
 * These tests pin CURRENT behavior of fulfillStripeCheckoutSession. Where the behavior looks
 * wrong it is labelled KNOWN DEFECT: the test documents it, it does not endorse it. A later
 * behavior PR should change the test deliberately.
 */

let db: typeof import('@/lib/db').db;
let fulfill: typeof import('@/lib/commerce/payment-fulfillment').fulfillStripeCheckoutSession;
const suffix = randomBytes(6).toString('hex');
const created = {
    users: [] as string[], courses: [] as string[], payments: [] as string[],
    events: [] as string[],
};

async function seedAttempt(opts: { amount?: string } = {}) {
    const [userId, courseId, paymentId] = [0, 1, 2].map((i) => `t-${suffix}-${i}-${created.payments.length}`);
    await db.insert(users).values({ id: userId, email: `${userId}@example.test`, name: 'Buyer' });
    await db.insert(courses).values({ id: courseId, title: 'Course', slug: `course-${userId}`, price: '100.00', status: 'published' });
    await db.insert(payments).values({
        id: paymentId, userId, courseId, amount: opts.amount ?? '100.00', currency: 'THB',
        method: 'stripe', status: 'pending',
    });
    created.users.push(userId); created.courses.push(courseId); created.payments.push(paymentId);
    return { userId, courseId, paymentId };
}

function sessionFor(a: { userId: string; courseId: string; paymentId: string }, over: Partial<Stripe.Checkout.Session> = {}, couponId?: string) {
    return {
        payment_status: 'paid', amount_total: 10000, currency: 'thb', payment_intent: `pi_${suffix}_${a.paymentId}`,
        metadata: { paymentId: a.paymentId, userId: a.userId, type: 'course', courseId: a.courseId, ...(couponId ? { couponId } : {}) },
        ...over,
    } as unknown as Stripe.Checkout.Session;
}

const enrollmentRows = (userId: string) => db.select().from(enrollments).where(eq(enrollments.userId, userId));
const paymentRow = async (id: string) => (await db.select().from(payments).where(eq(payments.id, id)))[0];

beforeAll(async () => {
    // Deliberately refuse owner databases and non-loopback connections.
    const target = new URL(process.env.DATABASE_URL ?? 'invalid');
    if (target.protocol !== 'mysql:' || target.hostname !== '127.0.0.1' || target.pathname !== '/milerdev_e2e') {
        throw new Error('Stripe fulfillment integration tests require the dedicated loopback milerdev_e2e database');
    }
    ({ db } = await import('@/lib/db'));
    ({ fulfillStripeCheckoutSession: fulfill } = await import('@/lib/commerce/payment-fulfillment'));
    await db.execute(sql`SELECT 1`);
});

afterAll(async () => {
    if (!db) return;
    // Only rows created here are removed; shared tables are never truncated.
    if (created.events.length) await db.delete(stripeEvents).where(inArray(stripeEvents.id, created.events));
    if (created.users.length) await db.delete(enrollments).where(inArray(enrollments.userId, created.users));
    if (created.payments.length) {
        await db.delete(stripeEvents).where(inArray(stripeEvents.paymentId, created.payments));
        await db.delete(payments).where(inArray(payments.id, created.payments));
    }
    if (created.courses.length) await db.delete(courses).where(inArray(courses.id, created.courses));
    if (created.users.length) await db.delete(users).where(inArray(users.id, created.users));
    await db.$client.end();
});

describe('Stripe fulfillment on real MySQL', () => {
    it('grants one enrollment and completes the payment on the first event', async () => {
        const a = await seedAttempt();
        const event = { id: `evt_${suffix}_first`, type: 'checkout.session.completed' };
        created.events.push(event.id);

        const result = await fulfill({ session: sessionFor(a), event });

        expect(result.status).toBe('fulfilled');
        expect((await paymentRow(a.paymentId)).status).toBe('completed');
        expect(await enrollmentRows(a.userId)).toHaveLength(1);
        expect(await db.select().from(stripeEvents).where(eq(stripeEvents.id, event.id))).toHaveLength(1);
    });

    it('treats a replayed event id as a no-op: one enrollment, one event row', async () => {
        const a = await seedAttempt();
        const event = { id: `evt_${suffix}_replay`, type: 'checkout.session.completed' };
        created.events.push(event.id);

        const first = await fulfill({ session: sessionFor(a), event });
        const second = await fulfill({ session: sessionFor(a), event });

        expect(first.status).toBe('fulfilled');
        expect(second.status).toBe('replayed');
        expect(await enrollmentRows(a.userId)).toHaveLength(1);
        expect(await db.select().from(stripeEvents).where(eq(stripeEvents.id, event.id))).toHaveLength(1);
    });

    it('lets two different events for the same session race without double enrollment', async () => {
        const a = await seedAttempt();
        const events = ['a', 'b'].map((n) => ({ id: `evt_${suffix}_race_${n}`, type: 'checkout.session.completed' }));
        created.events.push(...events.map((e) => e.id));

        const settled = await Promise.allSettled(events.map((event) => fulfill({ session: sessionFor(a), event })));

        // Exactly one wins. The loser either sees the completed payment, is told to retry, or
        // hits a MySQL deadlock that escapes as a thrown error (the webhook route turns that
        // into HTTP 500 so Stripe redelivers). KNOWN BEHAVIOR: the deadlock is not caught here.
        const fulfilled = settled.filter((r) => r.status === 'fulfilled' && r.value.status === 'fulfilled');
        expect(fulfilled).toHaveLength(1);
        for (const r of settled) {
            if (r.status === 'rejected') {
                expect((r.reason as { cause?: { code?: string } }).cause?.code ?? (r.reason as { code?: string }).code)
                    .toBe('ER_LOCK_DEADLOCK');
            } else if (r.value.status !== 'fulfilled') {
                expect(['already_fulfilled', 'rejected']).toContain(r.value.status);
            }
        }
        expect(await enrollmentRows(a.userId)).toHaveLength(1);
        expect((await paymentRow(a.paymentId)).status).toBe('completed');

        // The redelivery of whichever event lost converges without a second enrollment.
        const redelivery = await fulfill({ session: sessionFor(a), event: events[1] });
        expect(['already_fulfilled', 'replayed']).toContain(redelivery.status);
        expect(await enrollmentRows(a.userId)).toHaveLength(1);
    });

    it('rejects a paid session whose amount differs from the local payment and grants nothing', async () => {
        const a = await seedAttempt();

        const result = await fulfill({ session: sessionFor(a, { amount_total: 9999 }) });

        expect(result).toMatchObject({ status: 'rejected', code: 'PAYMENT_AMOUNT_MISMATCH' });
        expect((await paymentRow(a.paymentId)).status).toBe('pending');
        expect(await enrollmentRows(a.userId)).toHaveLength(0);
    });

    it('rejects a session that is not paid and grants nothing', async () => {
        const a = await seedAttempt();

        const result = await fulfill({ session: sessionFor(a, { payment_status: 'unpaid' }) });

        expect(result).toMatchObject({ status: 'rejected', code: 'SESSION_NOT_PAID' });
        expect(await enrollmentRows(a.userId)).toHaveLength(0);
    });

    it('rolls back the event row when fulfillment is rejected, so Stripe can retry', async () => {
        const a = await seedAttempt();
        const event = { id: `evt_${suffix}_rollback`, type: 'checkout.session.completed' };
        created.events.push(event.id);

        const result = await fulfill({ session: sessionFor(a, { amount_total: 1 }), event });

        expect(result.status).toBe('rejected');
        expect(await db.select().from(stripeEvents).where(eq(stripeEvents.id, event.id))).toHaveLength(0);
    });

    it('fulfills a session that still carries couponId metadata from before coupons were retired', async () => {
        const a = await seedAttempt();

        const result = await fulfill({ session: sessionFor(a, {}, 'retired-coupon') });

        expect(result.status).toBe('fulfilled');
        expect(await enrollmentRows(a.userId)).toHaveLength(1);
    });
});

import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { and, eq, sql } from 'drizzle-orm';

vi.mock('next/headers', () => ({ headers: async () => new Map() }));
vi.mock('@/lib/privacy-consent', () => ({ getMemberConsentId: async () => null }));
vi.mock('@/lib/enrollment-measurement-projector', () => ({ enrollmentMeasurementProjector: { projectEnrollment: vi.fn() } }));
vi.mock('@/lib/purchase-measurement-projector', () => ({ purchaseMeasurementProjector: { projectPurchase: vi.fn() } }));
import { db } from '@/lib/db';
import { auditLogs, certificates, courses, enrollments, lessonProgress, lessons, payments, users } from '@/lib/db/schema';
import { changeAdminEnrollmentAccess, grantAdminEnrollment } from '@/lib/admin-enrollment';
import { fulfillFreeEnrollment } from '@/lib/free-enrollment-fulfillment';
import { safeInsertEnrollment } from '@/lib/db/safe-insert';
import { fulfillStripeCheckoutSession } from '@/lib/payment-fulfillment';

const actor = { actorId: randomUUID(), context: { ipAddress: null, userAgent: null } };
const memberId = randomUUID();
const courseIds = [randomUUID(), randomUUID()];
const lessonIds = [randomUUID(), randomUUID()];
const enrollmentIds = [randomUUID(), randomUUID()];
const completedAt = new Date('2026-08-01T00:00:00Z');
let verifiedTarget = false;

describe('admin enrollment on disposable MySQL', () => {
  beforeAll(async () => {
    const target = new URL(process.env.DATABASE_URL ?? '');
    if (target.hostname !== '127.0.0.1' || !['3306', '3307'].includes(target.port || '3306') || target.pathname !== '/milerdev_e2e') {
      throw new Error('Requires disposable local enrollment MySQL');
    }
    const [identity] = await db.execute(sql`SELECT DATABASE() AS name, @@port AS port`);
    const info = (identity as unknown as { name: string; port: number }[])[0];
    if (info.name !== 'milerdev_e2e' || Number(info.port) !== Number(target.port || 3306)) {
      throw new Error('Refusing non-disposable database');
    }
    verifiedTarget = true;
    await db.insert(users).values([
      { id: actor.actorId, email: `${actor.actorId}@example.test`, role: 'admin' },
      { id: memberId, email: `${memberId}@example.test`, role: 'student' },
    ]);
    for (let index = 0; index < 2; index++) {
      await db.insert(courses).values({ id: courseIds[index], slug: courseIds[index], title: `Fixture ${index}`, price: '100.00', status: 'published' });
      await db.insert(lessons).values({ id: lessonIds[index], courseId: courseIds[index], title: 'Lesson', orderIndex: 1 });
      await db.insert(enrollments).values({ id: enrollmentIds[index], courseId: courseIds[index], userId: memberId, progressPercent: 100, completedAt });
      await db.insert(lessonProgress).values({ userId: memberId, lessonId: lessonIds[index], completed: true, watchTimeSeconds: 37 });
    }
    await db.insert(certificates).values({ userId: memberId, courseId: courseIds[0], certificateCode: randomUUID().slice(0, 20), recipientName: 'Fixture member', courseTitle: 'Fixture 0', completedAt });
  });

  afterAll(async () => {
    if (!verifiedTarget) return;
    await db.delete(auditLogs).where(eq(auditLogs.userId, actor.actorId));
    await db.delete(payments).where(eq(payments.userId, memberId));
    for (const id of courseIds) await db.delete(courses).where(eq(courses.id, id));
    await db.delete(users).where(eq(users.id, memberId));
    await db.delete(users).where(eq(users.id, actor.actorId));
  });

  it('serializes concurrent revocations, preserves both courses and certificate, and restores original identity', async () => {
    const before = await db.select().from(lessonProgress).where(eq(lessonProgress.userId, memberId));
    const changes = await Promise.all([1, 2].map(() => changeAdminEnrollmentAccess({ ...actor, enrollmentId: enrollmentIds[0], action: 'revoke', reason: 'test withdrawal' })));
    expect(changes.map((result) => result.kind).sort()).toEqual(['revoked', 'unchanged']);
    expect(await db.select().from(lessonProgress).where(eq(lessonProgress.userId, memberId))).toEqual(before);
    expect(await db.select().from(certificates).where(eq(certificates.userId, memberId))).toHaveLength(1);
    expect(await db.select().from(auditLogs).where(eq(auditLogs.entityId, enrollmentIds[0]))).toHaveLength(1);
    const [other] = await db.select().from(enrollments).where(eq(enrollments.id, enrollmentIds[1]));
    expect(other.revokedAt).toBeNull();
    await grantAdminEnrollment({ ...actor, userId: memberId, courseId: courseIds[0] });
    const [restored] = await db.select().from(enrollments).where(eq(enrollments.id, enrollmentIds[0]));
    expect(restored).toMatchObject({ revokedAt: null, progressPercent: 100, completedAt });
  });

  it('rolls back the access update when the audit actor violates a foreign key', async () => {
    await expect(changeAdminEnrollmentAccess({ ...actor, actorId: randomUUID(), enrollmentId: enrollmentIds[0], action: 'revoke', reason: 'rollback test' })).rejects.toThrow();
    const [current] = await db.select().from(enrollments).where(eq(enrollments.id, enrollmentIds[0]));
    expect(current.revokedAt).toBeNull();
  });

  it('free grants, paid recovery, import and Stripe replay cannot reactivate withdrawn access', async () => {
    await changeAdminEnrollmentAccess({ ...actor, enrollmentId: enrollmentIds[0], action: 'revoke', reason: 'keep withdrawn' });
    await expect(fulfillFreeEnrollment({ userId: memberId, courseIds: [courseIds[0]] })).rejects.toThrow('ENROLLMENT_REVOKED');
    await expect(safeInsertEnrollment(memberId, courseIds[0])).rejects.toThrow('ENROLLMENT_REVOKED');
    expect(await grantAdminEnrollment({ ...actor, userId: memberId, courseId: courseIds[0], importHistory: { enrolledAt: new Date(), progressPercent: 0, completedAt: null } })).toMatchObject({ kind: 'existing' });
    const paymentId = randomUUID();
    await db.insert(payments).values({ id: paymentId, userId: memberId, courseId: courseIds[0], amount: '100.00', currency: 'THB', method: 'stripe', status: 'completed', stripePaymentId: 'pi_fixture' });
    const result = await fulfillStripeCheckoutSession({ session: {
      metadata: { paymentId, userId: memberId, type: 'course', courseId: courseIds[0] },
      payment_status: 'paid', payment_intent: 'pi_fixture', amount_total: 10000, currency: 'thb',
    } as never });
    expect(result.status).toBe('already_fulfilled');
    const entries = await db.select().from(enrollments).where(and(eq(enrollments.userId, memberId), eq(enrollments.courseId, courseIds[0])));
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ id: enrollmentIds[0], progressPercent: 100, completedAt, revokedAt: expect.any(Date) });
  });
});

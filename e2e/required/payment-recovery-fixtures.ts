import mysql, { type RowDataPacket } from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import { and, eq, like, sql } from 'drizzle-orm';
import { parseE2EFixtureTarget } from '../../scripts/e2e-fixture-target';
import { payments, users, enrollments } from '../../src/lib/db/schema';
import { E2E_FIXTURES } from '../fixtures';

async function fixtureDatabase(userId: string) {
  const target = parseE2EFixtureTarget(process.env.E2E_DATABASE_URL);
  const connection = await mysql.createConnection(process.env.E2E_DATABASE_URL!);
  try {
    const [identity] = await connection.query<RowDataPacket[]>('SELECT DATABASE() AS db, @@port AS port');
    if (identity[0]?.db !== target.database || Number(identity[0]?.port) !== target.port) throw new Error('E2E database identity mismatch');
    const db = drizzle(connection);
    const [owner] = await db.select({ id: users.id }).from(users)
      .where(and(eq(users.id, userId), like(users.email, 'payment-recovery-%@example.test')));
    if (!owner) throw new Error('Only a buyer created by this recovery test can own fixtures');
    return { connection, db };
  } catch (error) { await connection.end(); throw error; }
}

export async function seedPaymentRecovery(userId: string, type: 'course' | 'bundle') {
  const { connection, db } = await fixtureDatabase(userId);
  try {
    const product = type === 'course' ? E2E_FIXTURES.courses.longThai : E2E_FIXTURES.bundle;
    const id = crypto.randomUUID();
    const latest = crypto.randomUUID();
    const refunded = crypto.randomUUID();
    const target = type === 'course' ? { courseId: product.id } : { bundleId: product.id };
    await db.insert(payments).values([
      { id, userId, ...target, itemTitle: product.title, amount: '490.25', currency: 'THB', method: 'stripe', status: 'completed', stripePaymentId: `pi_e2e_${id}`, createdAt: new Date(Date.now() - 60_000) },
      { id: refunded, userId, ...target, itemTitle: 'รายการที่คืนเงินแล้ว', amount: '590.00', currency: 'THB', method: 'promptpay', status: 'refunded', createdAt: new Date(Date.now() - 90_000) },
      { id: latest, userId, ...target, itemTitle: 'รายการใหม่ที่ไม่สำเร็จ', amount: '999.00', currency: 'THB', method: 'stripe', status: 'failed', createdAt: new Date() },
    ]);
    const payload = Buffer.from(JSON.stringify({ u: userId, p: id, t: type, i: product.id, a: 49025 })).toString('base64url');
    return { id, latest, refunded, sessionId: `cs_e2e_${payload}` };
  } finally { await connection.end(); }
}

export async function recoveryEnrollmentCount(userId: string) {
  const { connection, db } = await fixtureDatabase(userId);
  try {
    const [row] = await db.select({ count: sql<number>`count(*)` }).from(enrollments).where(eq(enrollments.userId, userId));
    return Number(row.count);
  } finally { await connection.end(); }
}

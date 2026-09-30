import { randomUUID } from 'node:crypto';
import mysql, { type Connection } from 'mysql2/promise';
import { drizzle, type MySql2Database } from 'drizzle-orm/mysql2';
import { eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { analyticsEvents, measurementOutbox, payments, privacyConsents, users } from '@/lib/db/schema';
import { privacyRetentionCutoffs, runPrivacyRetention } from '@/lib/privacy-retention';

const userId = randomUUID();
const eventIds = [randomUUID(), randomUUID()];
const paymentId = randomUUID();
const queueId = randomUUID();
const paymentIds = [paymentId];
const queueIds = [queueId];
const consentIds = [randomUUID(), randomUUID()];
const now = new Date('2026-09-13T00:00:00Z');
const old = new Date('2024-01-01T00:00:00Z');
let connection: Connection;
let database: MySql2Database;

beforeAll(async () => {
  const url = new URL(process.env.DATABASE_URL ?? '');
  if (url.hostname !== '127.0.0.1' || !(
    (url.port === '3319' && url.pathname === '/milerdev_consent_test')
    || ((url.port === '' || url.port === '3306') && url.pathname === '/milerdev_e2e')
  )) throw new Error('Dedicated local test database required');
  connection = await mysql.createConnection(process.env.DATABASE_URL!);
  database = drizzle(connection);
  await database.insert(users).values({ id: userId, name: 'Retention test', email: `${userId}@example.test` });
  await database.insert(payments).values({ id: paymentId, userId, amount: '100.00', currency: 'THB', method: 'stripe', status: 'completed', createdAt: old, attributedExposureId: randomUUID() });
  await database.insert(analyticsEvents).values(eventIds.map((id, index) => ({ id, userId, eventName: 'registration_completed', source: 'server' as const, createdAt: index === 0 ? old : now })));
  await database.insert(measurementOutbox).values({ id: queueId, eventName: 'purchase_completed', paymentId, createdAt: old });
  await database.insert(privacyConsents).values(consentIds.map((id, index) => ({ id, userId, version: 1, analytics: true, createdAt: old, expiresAt: new Date('2027-01-01T00:00:00Z'), revokedAt: index === 0 ? old : null })));
});

afterAll(async () => {
  if (!connection) return;
  try {
    await database.delete(measurementOutbox).where(inArray(measurementOutbox.id, queueIds));
    await database.delete(analyticsEvents).where(inArray(analyticsEvents.id, eventIds));
    await database.delete(payments).where(inArray(payments.id, paymentIds));
    await database.delete(users).where(eq(users.id, userId));
  } finally { await connection.end(); }
});

it('defaults to counts only, expires optional rows, preserves commerce and is idempotent', async () => {
  const preview = await runPrivacyRetention(connection, { now });
  expect(preview.mode).toBe('dry-run');
  expect(preview.results.analytics.affected).toBe(0);
  expect(await database.select().from(analyticsEvents).where(inArray(analyticsEvents.id, eventIds))).toHaveLength(2);
  const result = await runPrivacyRetention(connection, { now, apply: true, batchSize: 1, maxBatches: 20 });
  expect(result.results.analytics.affected).toBeGreaterThanOrEqual(1);
  expect(await database.select().from(analyticsEvents).where(inArray(analyticsEvents.id, eventIds))).toEqual([expect.objectContaining({ id: eventIds[1] })]);
  expect(await database.select().from(measurementOutbox).where(eq(measurementOutbox.id, queueId))).toHaveLength(0);
  expect(await database.select().from(privacyConsents).where(inArray(privacyConsents.id, consentIds))).toEqual([expect.objectContaining({ id: consentIds[1] })]);
  expect(await database.select().from(payments).where(eq(payments.id, paymentId))).toEqual([expect.objectContaining({ amount: '100.00', status: 'completed', userId, attributedExposureId: null })]);
  const repeated = await runPrivacyRetention(connection, { now, apply: true });
  expect(Object.values(repeated.results).every(({ affected }) => affected === 0)).toBe(true);
});

it('uses a calendar-year evidence cutoff and refuses unbounded batches', async () => {
  expect(privacyRetentionCutoffs(new Date('2028-02-29T00:00:00Z')).evidence.toISOString()).toBe('2027-02-28T00:00:00.000Z');
  await expect(runPrivacyRetention(connection, { batchSize: 100_000 })).rejects.toThrow('Invalid retention bounds');
});

it('refuses concurrent cleanup on a second connection', async () => {
  const other = await mysql.createConnection(process.env.DATABASE_URL!);
  try {
    await other.execute('SELECT GET_LOCK(?, 0)', ['milerdev:privacy-retention']);
    await expect(runPrivacyRetention(connection, { now, apply: true })).rejects.toThrow('Retention already running');
  } finally {
    await other.execute('SELECT RELEASE_LOCK(?)', ['milerdev:privacy-retention']);
    await other.end();
  }
  expect((await runPrivacyRetention(connection, { now })).mode).toBe('dry-run');
});

it('keeps raw facts until the bounded outbox backlog is fully removed', async () => {
  const eventId = randomUUID();
  eventIds.push(eventId);
  await database.insert(analyticsEvents).values({ id: eventId, userId, eventName: 'registration_completed', createdAt: old });
  for (let index = 0; index < 2; index++) {
    const payment = randomUUID();
    const queue = randomUUID();
    paymentIds.push(payment);
    queueIds.push(queue);
    await database.insert(payments).values({ id: payment, userId, amount: '100.00', currency: 'THB', method: 'stripe', status: 'pending', createdAt: old });
    await database.insert(measurementOutbox).values({ id: queue, paymentId: payment, eventName: 'purchase_completed', createdAt: old });
  }
  const partial = await runPrivacyRetention(connection, { now, apply: true, batchSize: 1, maxBatches: 1 });
  expect(partial.results.outbox.remaining).toBeGreaterThan(0);
  expect(partial.results.analytics).toBeUndefined();
  expect(await database.select().from(analyticsEvents).where(eq(analyticsEvents.id, eventId))).toHaveLength(1);
  await runPrivacyRetention(connection, { now, apply: true });
  expect(await database.select().from(analyticsEvents).where(eq(analyticsEvents.id, eventId))).toHaveLength(0);
});

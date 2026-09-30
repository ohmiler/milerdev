import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { eq } from 'drizzle-orm';

const fixture = vi.hoisted(() => ({ cookie: '' }));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => ({ value: fixture.cookie }) }) }));

import { db } from '@/lib/db';
import { users, analyticsEvents } from '@/lib/db/schema';
import { getMeasurementDatabase, measurementTransaction } from '@/lib/measurement-database';
import { saveBrowserConsent, readBrowserConsent, withBrowserConsent, getMemberConsentId, lockActiveConsent } from '@/lib/privacy-consent';

const userId = randomUUID();
const eventIds: string[] = [];

function isIsolatedDatabase() {
  const url = new URL(process.env.DATABASE_URL ?? '');
  return url.hostname === '127.0.0.1' && (
    (url.port === '3319' && url.pathname === '/milerdev_consent_test')
    || ((url.port === '' || url.port === '3306') && url.pathname === '/milerdev_e2e')
  );
}

describe('consent on isolated MySQL', () => {
  beforeAll(async () => {
    if (!isIsolatedDatabase()) {
      throw new Error('This test requires its dedicated local consent database');
    }
    await db.insert(users).values({ id: userId, name: 'Consent test', email: `${userId}@consent-test.invalid` });
  });

  afterAll(async () => {
    if (isIsolatedDatabase()) {
      for (const eventId of eventIds) await db.delete(analyticsEvents).where(eq(analyticsEvents.id, eventId));
      await db.delete(users).where(eq(users.id, userId));
    }
  });

  it.each(['browser', 'projector'])('serializes withdrawal with %s collection and rejects old grants after re-consenting', async (collector) => {
    const eventId = randomUUID();
    eventIds.push(eventId);
    const grant = await saveBrowserConsent(userId, true);
    fixture.cookie = grant.token;
    expect((await readBrowserConsent(userId)).analytics).toBe(true);
    const consentId = await getMemberConsentId(db, userId);
    expect(consentId).toBeTruthy();

    let entered!: () => void;
    let release!: () => void;
    const ready = new Promise<void>((resolve) => { entered = resolve; });
    const hold = new Promise<void>((resolve) => { release = resolve; });
    const collect = async () => {
      entered();
      await hold;
      await getMeasurementDatabase().insert(analyticsEvents).values({ id: eventId, userId, eventName: 'home_primary_cta_clicked', source: 'client' });
      return true;
    };
    const collection = collector === 'browser'
      ? withBrowserConsent(userId, collect, () => false)
      : db.transaction(async (tx) => {
        if (!(await lockActiveConsent(tx, consentId))) return false;
        return measurementTransaction.run(tx, collect);
      });
    await ready;
    let withdrawalFinished = false;
    const withdrawal = saveBrowserConsent(userId, false).then((result) => { withdrawalFinished = true; return result; });
    // Attach both handlers immediately so a deadlock is a normal test failure.
    const completed = Promise.all([collection, withdrawal]);
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(withdrawalFinished).toBe(false);
    release();
    const [collected, refused] = await completed;
    expect(collected).toBe(true);
    fixture.cookie = refused.token;
    expect((await readBrowserConsent(userId)).analytics).toBe(false);
    expect(await withBrowserConsent(userId, async () => 'unexpected', () => 'denied')).toBe('denied');
    expect(await db.transaction((tx) => lockActiveConsent(tx, consentId))).toBe(false);

    const later = await saveBrowserConsent(userId, true);
    fixture.cookie = later.token;
    expect((await readBrowserConsent(userId)).analytics).toBe(true);
    expect(await db.transaction((tx) => lockActiveConsent(tx, consentId))).toBe(false);
    expect(await getMemberConsentId(db, userId)).not.toBe(consentId);
  });
});

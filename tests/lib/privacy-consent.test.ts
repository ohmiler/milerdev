import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';

const fixture = vi.hoisted(() => ({ rows: [] as Record<string, unknown>[], cookie: '', inserts: [] as Record<string, unknown>[], updates: [] as Record<string, unknown>[] }));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => ({ value: fixture.cookie }) }) }));
vi.mock('@/lib/db', () => {
  const chain = {
    select: vi.fn(() => chain), from: vi.fn(() => chain), where: vi.fn(() => chain), orderBy: vi.fn(() => chain),
    limit: vi.fn(() => chain), for: vi.fn(() => chain),
    then: (resolve: (value: unknown) => unknown) => Promise.resolve(resolve(fixture.rows)),
    insert: vi.fn(() => ({ values: async (row: Record<string, unknown>) => { fixture.inserts.push(row); } })),
    update: vi.fn(() => ({ set: (row: Record<string, unknown>) => ({ where: async () => { fixture.updates.push(row); } }) })),
    transaction: async (work: (tx: unknown) => Promise<unknown>) => work(chain),
  };
  return { db: chain };
});
import { db } from '@/lib/db';
import { readBrowserConsent, saveBrowserConsent, lockActiveConsent } from '@/lib/privacy-consent';
import { CONSENT_VERSION, UNKNOWN_CONSENT, isConsentCurrent } from '@/lib/privacy-consent-contract';

const valid = () => ({ id: 'receipt', userId: 'user-1', version: CONSENT_VERSION, analytics: true, revokedAt: null, expiresAt: new Date(Date.now() + 60_000) });

describe('consent authority', () => {
  beforeEach(() => { fixture.cookie = 'a'.repeat(64); fixture.rows = [valid()]; fixture.inserts = []; fixture.updates = []; });

  it('requires a current receipt bound to the current account', async () => {
    expect((await readBrowserConsent('user-1')).analytics).toBe(true);
    expect(await readBrowserConsent('user-2')).toEqual(UNKNOWN_CONSENT);
    expect(await readBrowserConsent(null)).toEqual(UNKNOWN_CONSENT);
  });

  it('fails closed on absent, malformed, revoked, expired or obsolete receipts', async () => {
    fixture.cookie = 'forged';
    expect(await readBrowserConsent('user-1')).toEqual(UNKNOWN_CONSENT);
    fixture.cookie = 'a'.repeat(64);
    for (const record of [null, { ...valid(), revokedAt: new Date() }, { ...valid(), expiresAt: new Date(0) }, { ...valid(), version: 0 }]) {
      fixture.rows = record ? [record] : [];
      expect(await readBrowserConsent('user-1')).toEqual(UNKNOWN_CONSENT);
    }
  });

  it('stores only a token digest and explicit choice, and revokes the previous grant', async () => {
    const result = await saveBrowserConsent('user-1', false);
    expect(result.status).toMatchObject({ analytics: false, decided: true });
    expect(fixture.inserts).toHaveLength(1);
    expect(fixture.inserts[0]).toMatchObject({
      id: createHash('sha256').update(result.token).digest('hex'), userId: 'user-1', analytics: false, version: CONSENT_VERSION,
    });
    expect(JSON.stringify(fixture.inserts)).not.toContain(result.token);
    expect(Object.keys(fixture.inserts[0]).sort()).toEqual(['analytics', 'createdAt', 'expiresAt', 'id', 'revokedAt', 'userId', 'version']);
    expect(fixture.updates.every((row) => row.revokedAt instanceof Date)).toBe(true);
  });

  it('does not project legacy, withdrawn or expired grants on retry', async () => {
    const tx = db as unknown as Parameters<typeof lockActiveConsent>[0];
    expect(await lockActiveConsent(tx, null)).toBe(false);
    expect(await lockActiveConsent(tx, 'receipt')).toBe(true);
    fixture.rows = [{ ...valid(), revokedAt: new Date() }];
    expect(await lockActiveConsent(tx, 'receipt')).toBe(false);
    expect(isConsentCurrent({ ...valid(), expiresAt: new Date(0) })).toBe(false);
    expect(isConsentCurrent({ ...valid(), analytics: false })).toBe(false);
  });
});

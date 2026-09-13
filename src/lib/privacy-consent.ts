import 'server-only';

import { randomBytes, createHash } from 'node:crypto';
import { and, desc, eq, gt, isNull } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { measurementTransaction } from '@/lib/measurement-database';
import { privacyConsents, users } from '@/lib/db/schema';
import { CONSENT_COOKIE, CONSENT_MAX_AGE_SECONDS, CONSENT_VERSION, isConsentCurrent, UNKNOWN_CONSENT, type ConsentStatus } from '@/lib/privacy-consent-contract';

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type ConsentDatabase = Pick<Transaction, 'select' | 'insert' | 'update'>;

function digest(token: string): string | null {
  return /^[a-f0-9]{64}$/.test(token) ? createHash('sha256').update(token).digest('hex') : null;
}

export async function readBrowserConsent(userId: string | null): Promise<ConsentStatus> {
  try {
    const token = (await cookies()).get(CONSENT_COOKIE)?.value;
    const id = token ? digest(token) : null;
    if (!id) return UNKNOWN_CONSENT;
    const [record] = await db.select().from(privacyConsents).where(eq(privacyConsents.id, id)).limit(1);
    if (!record || record.userId !== userId || record.version !== CONSENT_VERSION
      || record.revokedAt || record.expiresAt <= new Date()) return UNKNOWN_CONSENT;
    return { analytics: record.analytics, decided: true, expiresAt: record.expiresAt.toISOString() };
  } catch {
    return UNKNOWN_CONSENT;
  }
}

export async function saveBrowserConsent(userId: string | null, analytics: boolean) {
  const token = randomBytes(32).toString('hex');
  const id = digest(token)!;
  const oldToken = (await cookies()).get(CONSENT_COOKIE)?.value;
  const oldId = oldToken ? digest(oldToken) : null;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + CONSENT_MAX_AGE_SECONDS * 1_000);
  await db.transaction(async (tx) => {
    // Serialize decisions for one account; never silently inherit another device's opt-in.
    if (userId) {
      await tx.select({ id: users.id }).from(users).where(eq(users.id, userId)).for('update');
      await tx.update(privacyConsents).set({ revokedAt: now })
        .where(and(eq(privacyConsents.userId, userId), isNull(privacyConsents.revokedAt)));
    }
    if (oldId) {
      await tx.update(privacyConsents).set({ revokedAt: now }).where(eq(privacyConsents.id, oldId));
    }
    await tx.insert(privacyConsents).values({ id, userId, version: CONSENT_VERSION, analytics, createdAt: now, expiresAt, revokedAt: null });
  });
  return { token, status: { analytics, decided: true, expiresAt: expiresAt.toISOString() } satisfies ConsentStatus };
}

export async function withBrowserConsent<T>(userId: string | null, collect: () => Promise<T>, denied: () => T): Promise<T> {
  const token = (await cookies()).get(CONSENT_COOKIE)?.value;
  const id = token ? digest(token) : null;
  if (!id) return denied();
  return db.transaction(async (tx) => {
    // Match withdrawal's user -> receipt order before downstream user FK checks.
    if (userId) await tx.select({ id: users.id }).from(users).where(eq(users.id, userId)).for('share');
    const [record] = await tx.select().from(privacyConsents).where(eq(privacyConsents.id, id)).limit(1).for('update');
    if (!isConsentCurrent(record) || record.userId !== userId) return denied();
    return measurementTransaction.run(tx, collect);
  });
}

// Capture the grant at the authoritative transition. A later grant cannot make old facts eligible.
export async function getMemberConsentId(database: ConsentDatabase, userId: string | null): Promise<string | null> {
  if (!userId) return null;
  try {
    const [record] = await database.select().from(privacyConsents).where(and(
      eq(privacyConsents.userId, userId), eq(privacyConsents.analytics, true),
      eq(privacyConsents.version, CONSENT_VERSION), isNull(privacyConsents.revokedAt),
      gt(privacyConsents.expiresAt, new Date()),
    )).orderBy(desc(privacyConsents.createdAt)).limit(1);
    return record?.id ?? null;
  } catch {
    // Consent infrastructure must fail closed without failing payment/learning.
    return null;
  }
}

// Lock the receipt until projection commits; withdrawal waits for any in-flight projection.
export async function lockActiveConsent(tx: Transaction, consentId: string | null): Promise<boolean> {
  if (!consentId) return false;
  // Discover the immutable binding without locking the receipt ahead of its user.
  const [binding] = await tx.select({ userId: privacyConsents.userId }).from(privacyConsents)
    .where(eq(privacyConsents.id, consentId)).limit(1);
  if (!binding) return false;
  if (binding.userId) await tx.select({ id: users.id }).from(users).where(eq(users.id, binding.userId)).for('share');
  const [record] = await tx.select().from(privacyConsents)
    .where(eq(privacyConsents.id, consentId)).limit(1).for('update');
  return isConsentCurrent(record);
}

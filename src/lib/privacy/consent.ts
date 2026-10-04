import 'server-only';

import { randomBytes, createHash } from 'node:crypto';
import { and, eq, isNull } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { privacyConsents, users } from '@/lib/db/schema';
import { CONSENT_COOKIE, CONSENT_MAX_AGE_SECONDS, CONSENT_VERSION, UNKNOWN_CONSENT, type ConsentStatus } from '@/lib/privacy/consent-contract';

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

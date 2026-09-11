import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import { hashNewPassword } from '@/lib/password-storage';
import { and, eq, gt, lte } from 'drizzle-orm';
import { db } from '@/lib/db';
import { emailRegistrations, users } from '@/lib/db/schema';
import { sendRegistrationVerificationEmail } from '@/lib/email';
import { createAuthReturnHref, resolveSafeAuthReturn } from '@/lib/safe-auth-return';

export const REGISTRATION_TTL_MS = 30 * 60 * 1000;
export const REGISTRATION_ACCEPTED = { message: 'ตรวจสอบคำขอแล้ว', retryAfterSeconds: 60 };
export const hashRegistrationToken = (token: string) => createHash('sha256').update(token).digest('hex');

export async function requestEmailRegistration(email: string, callbackUrl: unknown) {
    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (existing) return;
    const token = randomBytes(32).toString('hex');
    const tokenHash = hashRegistrationToken(token);
    const { pathname: returnTo } = resolveSafeAuthReturn(callbackUrl);
    // Resends cannot revoke links already delivered or reserve a user identity.
    await db.delete(emailRegistrations).where(and(
        eq(emailRegistrations.email, email), lte(emailRegistrations.expiresAt, new Date()),
    ));
    await db.insert(emailRegistrations).values({
        tokenHash, email, returnTo, expiresAt: new Date(Date.now() + REGISTRATION_TTL_MS),
    });
    const sent = await sendRegistrationVerificationEmail({ email, token, returnTo }).catch(() => false);
    if (!sent) {
        await db.delete(emailRegistrations).where(eq(emailRegistrations.tokenHash, tokenHash));
        console.error('[Registration] Verification email delivery failed');
    }
}

function isDuplicateEntry(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false;
    const candidate = error as { code?: unknown; cause?: unknown };
    return candidate.code === 'ER_DUP_ENTRY'
        || (!!candidate.cause && candidate.cause !== error && isDuplicateEntry(candidate.cause));
}

export async function completeEmailRegistration(token: string, name: string, password: string) {
    const tokenHash = hashRegistrationToken(token);
    const [pending] = await db.select().from(emailRegistrations).where(and(
        eq(emailRegistrations.tokenHash, tokenHash), gt(emailRegistrations.expiresAt, new Date()),
    )).limit(1);
    if (!pending) return null;
    const passwordHash = await hashNewPassword(password);
    try {
        return await db.transaction(async (tx) => {
            // Atomic one-use claim, expiry rechecked after password screening and hashing. Rollback
            // restores the claim if persistence fails; GET never consumes it.
            const claim = await tx.delete(emailRegistrations).where(and(
                eq(emailRegistrations.tokenHash, tokenHash), gt(emailRegistrations.expiresAt, new Date()),
            ));
            if (claim[0].affectedRows !== 1) return null;
            // Unique email arbitrates Google/signup races. Never update an
            // existing account's password, OAuth links, role or verification.
            await tx.insert(users).values({
                email: pending.email, name, passwordHash, role: 'student', emailVerifiedAt: new Date(),
            });
            return { loginHref: createAuthReturnHref('/login', pending.returnTo) };
        });
    } catch (error) {
        if (isDuplicateEntry(error)) return null;
        throw error;
    }
}

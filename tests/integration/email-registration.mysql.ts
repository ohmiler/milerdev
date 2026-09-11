import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { randomBytes } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { verifyPassword } from '@/lib/password-storage';
import { assertPasswordNotCompromised } from '@/lib/password-screening';
import { PasswordSecurityError } from '@/lib/password-errors';
vi.mock('@/lib/password-screening', () => ({ assertPasswordNotCompromised: vi.fn().mockResolvedValue(undefined) }));
import { emailRegistrations, users } from '@/lib/db/schema';

const mocks = vi.hoisted(() => ({ send: vi.fn().mockResolvedValue(true) }));
vi.mock('@/lib/email', () => ({ sendRegistrationVerificationEmail: mocks.send }));
let db: typeof import('@/lib/db').db;
let service: typeof import('@/lib/email-registration');
const suffix = randomBytes(6).toString('hex');
const addresses: string[] = [];
const mailbox = () => { const address = `registration-${suffix}-${addresses.length}@example.test`; addresses.push(address); return address; };
const tokenFor = (email: string) => mocks.send.mock.calls.filter(([input]) => input.email === email).at(-1)![0].token as string;
const findUser = async (email: string) => (await db.select().from(users).where(eq(users.email, email)).limit(1))[0];
async function issue() { const email = mailbox(); await service.requestEmailRegistration(email, '/courses'); return { email, token: tokenFor(email) }; }

beforeAll(async () => {
    // Deliberately refuse owner databases and non-loopback connections.
    const target = new URL(process.env.DATABASE_URL ?? 'invalid');
    if (target.protocol !== 'mysql:' || target.hostname !== '127.0.0.1'
        || !['/milerdev_e2e', '/milerdev_email_verification_e2e'].includes(target.pathname)) {
        throw new Error('Registration integration tests require a dedicated loopback E2E database');
    }
    ({ db } = await import('@/lib/db'));
    service = await import('@/lib/email-registration');
    await db.execute(sql`SELECT 1`);
});
afterAll(async () => {
    if (!db) return;
    // Only test-created addresses are disposable; never truncate shared tables.
    for (const email of addresses) {
        await db.delete(emailRegistrations).where(eq(emailRegistrations.email, email));
        await db.delete(users).where(eq(users.email, email));
    }
    await db.$client.end();
});

describe('real MySQL registration ownership and concurrency', () => {
    it.each(['compromised', 'screening_unavailable'] as const)('preserves an unclaimed token on %s and allows a successful retry', async (kind) => {
        const { email, token } = await issue();
        vi.mocked(assertPasswordNotCompromised).mockRejectedValueOnce(new PasswordSecurityError(kind, 'Safe test failure'));
        await expect(service.completeEmailRegistration(token, 'Owner', 'OwnerPassphrase1!')).rejects.toMatchObject({ kind });
        expect(await findUser(email)).toBeUndefined();
        const pending = await db.select().from(emailRegistrations).where(eq(emailRegistrations.email, email));
        expect(pending).toHaveLength(1);
        expect(await service.completeEmailRegistration(token, 'Owner', 'OwnerPassphrase1!')).not.toBeNull();
        expect(await verifyPassword('OwnerPassphrase1!', (await findUser(email)).passwordHash!)).toBe(true);
    });
    it('runs the request and confirmation HTTP handlers with real persistence and rate limits', async () => {
        const email = mailbox();
        const { POST: requestRegistration } = await import('@/app/api/auth/register/route');
        const { POST: confirmRegistration } = await import('@/app/api/auth/register/confirm/route');
        const request = (body: unknown) => new Request('http://localhost/api/auth/register', {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'x-real-ip': '192.0.2.87' }, body: JSON.stringify(body),
        });
        expect((await requestRegistration(request({ email, password: 'AttackerPassword1!', role: 'admin' }))).status).toBe(200);
        expect(await findUser(email)).toBeUndefined();
        const token = tokenFor(email);
        expect((await confirmRegistration(request({ token, name: 'Owner', password: 'OwnerPassword1!' }))).status).toBe(200);
        const user = await findUser(email);
        expect(await verifyPassword('AttackerPassword1!', user.passwordHash!)).toBe(false);
        expect(await verifyPassword('OwnerPassword1!', user.passwordHash!)).toBe(true);
        expect(user.role).toBe('student');
        expect((await confirmRegistration(request({ token, name: 'Replay', password: 'ReplayPassword1!' }))).status).toBe(400);
    });
    it('creates no authenticatable user until the token holder chooses a password', async () => {
        const { email, token } = await issue();
        expect(await findUser(email)).toBeUndefined();
        const [pending] = await db.select().from(emailRegistrations).where(eq(emailRegistrations.email, email));
        expect(pending.tokenHash).toBe(service.hashRegistrationToken(token));
        const result = await service.completeEmailRegistration(token, 'Owner', 'OwnerPassword1!');
        expect(result?.loginHref).toBe('/login?callbackUrl=%2Fcourses');
        const user = await findUser(email);
        expect(user.emailVerifiedAt).toBeInstanceOf(Date);
        expect(user.role).toBe('student');
        expect(await verifyPassword('OwnerPassword1!', user.passwordHash!)).toBe(true);
        expect(await service.completeEmailRegistration(token, 'Replay', 'ReplayPassword1!')).toBeNull();
    });
    it('allows only one simultaneous redemption of the same token', async () => {
        const { email, token } = await issue();
        const results = await Promise.all([
            service.completeEmailRegistration(token, 'First', 'FirstPassphrase1!'),
            service.completeEmailRegistration(token, 'Second', 'SecondPassword1!'),
        ]);
        expect(results.filter(Boolean)).toHaveLength(1);
        expect(await db.select().from(users).where(eq(users.email, email))).toHaveLength(1);
    });
    it('keeps old resend links usable but two different links cannot overwrite one account', async () => {
        const { email, token } = await issue();
        await service.requestEmailRegistration(email, '/bundles');
        const second = tokenFor(email);
        expect(second).not.toBe(token);
        expect(await db.select().from(emailRegistrations).where(eq(emailRegistrations.email, email))).toHaveLength(2);
        const results = await Promise.all([
            service.completeEmailRegistration(token, 'First', 'FirstPassphrase1!'),
            service.completeEmailRegistration(second, 'Second', 'SecondPassword1!'),
        ]);
        expect(results.filter(Boolean)).toHaveLength(1);
        const user = await findUser(email);
        const winner = results[0] ? 'FirstPassphrase1!' : 'SecondPassword1!';
        expect(await verifyPassword(winner, user.passwordHash!)).toBe(true);
    });
    it('rejects an expired token without creating a user', async () => {
        const { email, token } = await issue();
        await db.update(emailRegistrations).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(emailRegistrations.email, email));
        expect(await service.completeEmailRegistration(token, 'Owner', 'OwnerPassword1!')).toBeNull();
        expect(await findUser(email)).toBeUndefined();
    });
    it('does not attach password credentials if Google creates the email first', async () => {
        const { email, token } = await issue();
        await db.insert(users).values({ email, name: 'Google Owner', passwordHash: null });
        expect(await service.completeEmailRegistration(token, 'Other', 'OtherPassphrase1!')).toBeNull();
        const user = await findUser(email);
        expect(user.passwordHash).toBeNull(); expect(user.name).toBe('Google Owner');
    });
    it('leaves legacy members with no verified timestamp unchanged and able to authenticate', async () => {
        const email = mailbox();
        const passwordHash = await bcrypt.hash('LegacyPassword1!', 4);
        await db.insert(users).values({ email, name: 'Legacy', passwordHash });
        await service.requestEmailRegistration(email, '/courses');
        expect(mocks.send.mock.calls.some(([input]) => input.email === email)).toBe(false);
        const { authorizeCredentials } = await import('@/lib/auth-credentials');
        const sessionUser = await authorizeCredentials({ email, password: 'LegacyPassword1!' }, new Request('http://localhost'), {
            consumeRateLimit: async () => ({ success: true, remaining: 1, resetTime: Date.now() + 60000 }),
            findUserByEmail: () => findUser(email), comparePassword: verifyPassword,
        });
        expect(sessionUser?.email).toBe(email);
        expect((await findUser(email)).emailVerifiedAt).toBeNull();
    });
    it('removes the undelivered digest without creating an account', async () => {
        const email = mailbox(); mocks.send.mockResolvedValueOnce(false);
        await service.requestEmailRegistration(email, '/courses');
        expect(await findUser(email)).toBeUndefined();
        expect(await db.select().from(emailRegistrations).where(eq(emailRegistrations.email, email))).toHaveLength(0);
    });
    it('restores a claimed token on transaction failure so a legitimate retry can finish', async () => {
        const { email, token } = await issue();
        // Bypass the route schema in this storage test to force an actual SQL
        // insert error after the token DELETE, without changing the database schema.
        await expect(service.completeEmailRegistration(token, 'x'.repeat(300), 'OwnerPassword1!')).rejects.toBeDefined();
        expect(await findUser(email)).toBeUndefined();
        expect(await db.select().from(emailRegistrations).where(eq(emailRegistrations.email, email))).toHaveLength(1);
        expect(await service.completeEmailRegistration(token, 'Owner', 'OwnerPassword1!')).not.toBeNull();
    });
});

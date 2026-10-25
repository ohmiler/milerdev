import { describe, expect, it, vi } from 'vitest';

import { ACCOUNT_LOGIN_LIMIT, authorizeCredentials, NO_ACCOUNT_PASSWORD_HASH } from '@/lib/auth/credentials';
import { verifyPassword } from '@/lib/auth/password-storage';
import { applyJwtSessionPolicy } from '@/lib/auth/session';
import type { JWT } from 'next-auth/jwt';

const request = new Request('https://example.test/api/auth/callback/credentials', {
    method: 'POST',
    headers: {
        'x-real-ip': '203.0.113.10',
    },
});

function createDependencies() {
    return {
        consumeRateLimit: vi.fn().mockResolvedValue({
            success: true,
            remaining: 9,
            resetTime: Date.now() + 60_000,
        }),
        findUserByEmail: vi.fn().mockResolvedValue({
            id: 'user-1',
            email: 'learner@example.test',
            name: 'Learner',
            role: 'student',
            passwordHash: 'stored-hash',
            sessionVersion: 2,
            deactivatedAt: null,
        }),
        comparePassword: vi.fn().mockResolvedValue(true),
    };
}

describe('credentials authorization rate-limit boundary', () => {
    it.each([undefined, -1, 1.5, NaN])('rejects invalid credential version %s', async (sessionVersion) => {
        const dependencies = createDependencies();
        const user = await dependencies.findUserByEmail();
        dependencies.findUserByEmail.mockResolvedValue({ ...user, sessionVersion });
        await expect(authorizeCredentials(
            { email: user.email, password: 'Password1' }, request, dependencies,
        )).resolves.toBeNull();
        expect(dependencies.comparePassword).not.toHaveBeenCalled();
    });

    it('cannot mint a current JWT from an old password when reset completes during bcrypt', async () => {
        const dependencies = createDependencies();
        let version = 2;
        dependencies.comparePassword.mockImplementation(async () => {
            // The owner completes reset after the old password hash was loaded.
            version = 3;
            return true;
        });
        const user = await authorizeCredentials(
            { email: 'learner@example.test', password: 'OldPassword1' }, request, dependencies,
        );
        expect(user?.sessionVersion).toBe(2);
        const loadUserState = async () => ({ role: 'student', sessionVersion: version, deactivatedAt: null });
        await expect(applyJwtSessionPolicy({
            token: {} as JWT, user: user!, accountProvider: 'credentials', loadUserState,
        })).resolves.toBeNull();
        await expect(applyJwtSessionPolicy({
            token: { id: 'user-1', sessionVersion: 2 } as JWT, loadUserState,
        })).resolves.toBeNull();

        dependencies.findUserByEmail.mockResolvedValue({
            ...(await dependencies.findUserByEmail()), passwordHash: 'new-hash', sessionVersion: 3,
        });
        dependencies.comparePassword.mockImplementation(async (password) => password === 'NewPassword1');
        await expect(authorizeCredentials(
            { email: 'learner@example.test', password: 'OldPassword1' }, request, dependencies,
        )).resolves.toBeNull();
        const recoveredUser = await authorizeCredentials(
            { email: 'learner@example.test', password: 'NewPassword1' }, request, dependencies,
        );
        await expect(applyJwtSessionPolicy({
            token: {} as JWT, user: recoveredUser!, accountProvider: 'credentials', loadUserState,
        })).resolves.toMatchObject({ id: 'user-1', sessionVersion: 3 });
    });

    it('rejects empty credential fields without consuming a bucket', async () => {
        const dependencies = createDependencies();

        await expect(authorizeCredentials(
            { email: '', password: '' },
            request,
            dependencies
        )).resolves.toBeNull();
        expect(dependencies.consumeRateLimit).not.toHaveBeenCalled();
        expect(dependencies.findUserByEmail).not.toHaveBeenCalled();
    });

    it('checks the shared IP bucket before user lookup and bcrypt', async () => {
        const dependencies = createDependencies();
        dependencies.consumeRateLimit.mockResolvedValue({
            success: false,
            remaining: 0,
            resetTime: Date.now() + 60_000,
        });

        const result = await authorizeCredentials(
            { email: 'learner@example.test', password: 'Password1' },
            request,
            dependencies
        );

        expect(result).toBeNull();
        expect(dependencies.consumeRateLimit).toHaveBeenCalledWith({
            namespace: 'login',
            identifier: '203.0.113.10',
            maxRequests: 10,
            windowMs: 60_000,
        });
        expect(dependencies.findUserByEmail).not.toHaveBeenCalled();
        expect(dependencies.comparePassword).not.toHaveBeenCalled();
    });

    it('gives each email its own budget that rotating client addresses cannot reset', async () => {
        const dependencies = createDependencies();
        const buckets = new Map<string, number>();
        dependencies.consumeRateLimit.mockImplementation(async ({ namespace, identifier, maxRequests }) => {
            const key = `${namespace} ${identifier}`;
            const count = (buckets.get(key) ?? 0) + 1;
            buckets.set(key, count);
            return { success: count <= maxRequests, remaining: Math.max(0, maxRequests - count), resetTime: Date.now() + 60_000 };
        });
        dependencies.comparePassword.mockResolvedValue(false);

        for (let attempt = 1; attempt <= ACCOUNT_LOGIN_LIMIT.maxRequests + 1; attempt++) {
            const fromNewAddress = new Request(request.url, { method: 'POST', headers: { 'x-real-ip': `192.0.2.${attempt}` } });
            await expect(authorizeCredentials(
                { email: ' Learner@Example.test ', password: `guess-${attempt}` }, fromNewAddress, dependencies,
            )).resolves.toBeNull();
        }

        // Every address was fresh, so only the email budget stopped the last guess.
        expect(dependencies.comparePassword).toHaveBeenCalledTimes(ACCOUNT_LOGIN_LIMIT.maxRequests);
        expect(dependencies.findUserByEmail).toHaveBeenCalledTimes(ACCOUNT_LOGIN_LIMIT.maxRequests);
        expect(dependencies.consumeRateLimit).toHaveBeenCalledWith({
            namespace: 'login-account', identifier: 'learner@example.test', maxRequests: 10, windowMs: 900_000,
        });
    });

    it('spends an email budget the same way whether or not the email has an account', async () => {
        const dependencies = createDependencies();
        dependencies.findUserByEmail.mockResolvedValue(undefined);

        await authorizeCredentials({ email: 'nobody@example.test', password: 'Password1' }, request, dependencies);

        expect(dependencies.consumeRateLimit).toHaveBeenCalledTimes(2);
        expect(dependencies.consumeRateLimit).toHaveBeenLastCalledWith(expect.objectContaining({
            namespace: 'login-account', identifier: 'nobody@example.test',
        }));
    });

    it('fails closed without user lookup when the limiter is unavailable', async () => {
        const dependencies = createDependencies();
        dependencies.consumeRateLimit.mockRejectedValue(
            new Error('Auth rate limiter unavailable')
        );

        await expect(authorizeCredentials(
            { email: 'learner@example.test', password: 'Password1' },
            request,
            dependencies
        )).resolves.toBeNull();
        expect(dependencies.findUserByEmail).not.toHaveBeenCalled();
        expect(dependencies.comparePassword).not.toHaveBeenCalled();
    });

    it('normalizes the email and returns the established user shape when allowed', async () => {
        const dependencies = createDependencies();

        const result = await authorizeCredentials(
            { email: ' Learner@Example.Test ', password: 'Password1' },
            request,
            dependencies
        );

        expect(dependencies.findUserByEmail).toHaveBeenCalledWith('learner@example.test');
        expect(dependencies.comparePassword).toHaveBeenCalledWith(
            'Password1',
            'stored-hash'
        );
        expect(result).toEqual({
            id: 'user-1',
            email: 'learner@example.test',
            name: 'Learner',
            role: 'student',
            sessionVersion: 2,
        });
    });

    it('denies an inactive account after the same password work, never checking its own hash', async () => {
        const dependencies = createDependencies();
        dependencies.findUserByEmail.mockResolvedValue({
            id: 'user-1',
            email: 'learner@example.test',
            name: 'Learner',
            role: 'student',
            passwordHash: 'stored-hash',
            deactivatedAt: new Date('2026-07-24T00:00:00.000Z'),
        });

        await expect(authorizeCredentials(
            { email: 'learner@example.test', password: 'Password1' },
            request,
            dependencies
        )).resolves.toBeNull();
        expect(dependencies.comparePassword).toHaveBeenCalledTimes(1);
        expect(dependencies.comparePassword).toHaveBeenCalledWith('Password1', NO_ACCOUNT_PASSWORD_HASH);
    });

    it.each([
        ['an unknown email', undefined],
        ['a Google-only account', { passwordHash: null }],
    ])('verifies the guess against a throwaway hash for %s and still denies it', async (_label, override) => {
        const dependencies = createDependencies();
        const user = await dependencies.findUserByEmail();
        dependencies.findUserByEmail.mockResolvedValue(override && { ...user, ...override });
        // Even a verifier that says yes cannot sign anyone in through the throwaway hash.
        dependencies.comparePassword.mockResolvedValue(true);

        await expect(authorizeCredentials(
            { email: 'learner@example.test', password: 'Password1' }, request, dependencies,
        )).resolves.toBeNull();
        expect(dependencies.comparePassword).toHaveBeenCalledWith('Password1', NO_ACCOUNT_PASSWORD_HASH);
    });

    it('uses a real argon2id hash at the cost of new passwords, which no guess matches', async () => {
        expect(NO_ACCOUNT_PASSWORD_HASH.startsWith('$argon2id$v=19$m=19456,p=1,t=2$')).toBe(true);
        await expect(verifyPassword('Password1', NO_ACCOUNT_PASSWORD_HASH)).resolves.toBe(false);
    });

    it('takes about as long for an unknown email as for a wrong password with the real verifier', async () => {
        const argon2 = (await import('argon2')).default;
        const realHash = await argon2.hash('CorrectHorse1!', {
            type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1, hashLength: 32,
        });
        const dependencies = createDependencies();
        dependencies.comparePassword.mockImplementation(verifyPassword);
        const user = await dependencies.findUserByEmail();
        const median = async (account: unknown) => {
            dependencies.findUserByEmail.mockResolvedValue(account);
            const samples: number[] = [];
            for (let sample = 0; sample < 5; sample++) {
                const started = performance.now();
                await authorizeCredentials({ email: 'learner@example.test', password: 'WrongGuess1!' }, request, dependencies);
                samples.push(performance.now() - started);
            }
            return samples.sort((a, b) => a - b)[2];
        };

        const wrongPassword = await median({ ...user, passwordHash: realHash });
        const unknownEmail = await median(undefined);

        // Without the throwaway verify an unknown email returns in well under a millisecond, while
        // argon2 takes tens of milliseconds. A loose bound keeps this stable on busy machines.
        expect(unknownEmail).toBeGreaterThan(wrongPassword * 0.4);
    });

    it('fails closed when account state lookup is unavailable', async () => {
        const dependencies = createDependencies();
        dependencies.findUserByEmail.mockRejectedValue(new Error('database unavailable'));

        await expect(authorizeCredentials(
            { email: 'learner@example.test', password: 'Password1' },
            request,
            dependencies
        )).resolves.toBeNull();
        expect(dependencies.comparePassword).not.toHaveBeenCalled();
    });
});

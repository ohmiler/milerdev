import { describe, expect, it, vi } from 'vitest';

import { authorizeCredentials } from '@/lib/auth-credentials';
import { applyJwtSessionPolicy } from '@/lib/auth-session';
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

    it('returns the same denied shape for an inactive account without checking its password', async () => {
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
        expect(dependencies.comparePassword).not.toHaveBeenCalled();
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

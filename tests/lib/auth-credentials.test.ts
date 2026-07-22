import { describe, expect, it, vi } from 'vitest';

import { authorizeCredentials } from '@/lib/auth-credentials';

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
        }),
        comparePassword: vi.fn().mockResolvedValue(true),
    };
}

describe('credentials authorization rate-limit boundary', () => {
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
        });
    });
});

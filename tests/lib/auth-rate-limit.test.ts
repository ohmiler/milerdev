import { describe, expect, it, vi } from 'vitest';

import {
    consumeAuthRateLimit,
    createRateLimitKey,
} from '@/lib/auth-rate-limit';

describe('distributed auth rate limiter', () => {
    it('creates namespace-bound HMAC keys without retaining the identifier', () => {
        const identifier = '203.0.113.10';
        const first = createRateLimitKey('login', identifier, 'test-secret');
        const repeated = createRateLimitKey('login', identifier, 'test-secret');
        const otherNamespace = createRateLimitKey('register', identifier, 'test-secret');

        expect(first).toMatch(/^[a-f0-9]{64}$/);
        expect(first).toBe(repeated);
        expect(first).not.toBe(otherNamespace);
        expect(first).not.toContain(identifier);
    });

    it('maps the exact atomic bucket state to the public decision', async () => {
        const consumeBucket = vi.fn().mockResolvedValue({
            count: 3,
            resetTime: 1_800_000_000_000,
        });
        const cleanupExpiredBuckets = vi.fn().mockResolvedValue(undefined);

        const result = await consumeAuthRateLimit(
            {
                namespace: 'login',
                identifier: '203.0.113.10',
                maxRequests: 3,
                windowMs: 60_000,
            },
            {
                secret: 'test-secret',
                consumeBucket,
                cleanupExpiredBuckets,
            }
        );

        expect(result).toEqual({
            success: true,
            remaining: 0,
            resetTime: 1_800_000_000_000,
        });
        expect(consumeBucket).toHaveBeenCalledWith({
            keyHash: expect.stringMatching(/^[a-f0-9]{64}$/),
            windowMs: 60_000,
        });
        expect(cleanupExpiredBuckets).toHaveBeenCalledOnce();
    });

    it('blocks the first count above the configured maximum', async () => {
        const result = await consumeAuthRateLimit(
            {
                namespace: 'reset',
                identifier: '203.0.113.11',
                maxRequests: 5,
                windowMs: 60_000,
            },
            {
                secret: 'test-secret',
                consumeBucket: vi.fn().mockResolvedValue({
                    count: 6,
                    resetTime: 1_800_000_000_000,
                }),
                cleanupExpiredBuckets: vi.fn().mockResolvedValue(undefined),
            }
        );

        expect(result.success).toBe(false);
        expect(result.remaining).toBe(0);
    });

    it('fails closed on missing key material or invalid database state', async () => {
        const consumeBucket = vi.fn().mockResolvedValue({
            count: 0,
            resetTime: Number.NaN,
        });

        await expect(consumeAuthRateLimit(
            {
                namespace: 'login',
                identifier: '203.0.113.12',
                maxRequests: 10,
                windowMs: 60_000,
            },
            {
                secret: '',
                consumeBucket,
                cleanupExpiredBuckets: vi.fn(),
            }
        )).rejects.toThrow('Auth rate limiter unavailable');

        await expect(consumeAuthRateLimit(
            {
                namespace: 'login',
                identifier: '203.0.113.12',
                maxRequests: 10,
                windowMs: 60_000,
            },
            {
                secret: 'test-secret',
                consumeBucket,
                cleanupExpiredBuckets: vi.fn(),
            }
        )).rejects.toThrow('Auth rate limiter unavailable');
    });

    it('does not fail an authorized decision when bounded cleanup is unavailable', async () => {
        const result = await consumeAuthRateLimit(
            {
                namespace: 'login',
                identifier: '203.0.113.13',
                maxRequests: 10,
                windowMs: 60_000,
            },
            {
                secret: 'test-secret',
                consumeBucket: vi.fn().mockResolvedValue({
                    count: 1,
                    resetTime: 1_800_000_000_000,
                }),
                cleanupExpiredBuckets: vi.fn().mockRejectedValue(
                    new Error('database detail must not escape')
                ),
            }
        );

        expect(result.success).toBe(true);
    });
});

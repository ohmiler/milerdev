import { describe, it, expect, beforeEach, vi } from 'vitest';
import { checkRateLimit, rateLimits, getClientIP } from '@/lib/rate-limit';

describe('Rate Limiter', () => {
    beforeEach(() => {
        // Clear rate limit store before each test
        vi.useFakeTimers();
    });

    describe('checkRateLimit', () => {
        it('should allow requests within limit', () => {
            const key = 'test-key-1';
            const limit = { maxRequests: 5, windowMs: 60000 };

            for (let i = 0; i < 5; i++) {
                const result = checkRateLimit(key, limit);
                expect(result.success).toBe(true);
                expect(result.remaining).toBe(4 - i);
            }
        });

        it('should block requests over limit', () => {
            const key = 'test-key-2';
            const limit = { maxRequests: 3, windowMs: 60000 };

            // Use up the limit
            for (let i = 0; i < 3; i++) {
                checkRateLimit(key, limit);
            }

            // Next request should be blocked
            const result = checkRateLimit(key, limit);
            expect(result.success).toBe(false);
            expect(result.remaining).toBe(0);
        });

        it('should reset after window expires', () => {
            const key = 'test-key-3';
            const limit = { maxRequests: 2, windowMs: 1000 };

            // Use up the limit
            checkRateLimit(key, limit);
            checkRateLimit(key, limit);

            // Should be blocked
            expect(checkRateLimit(key, limit).success).toBe(false);

            // Advance time past window
            vi.advanceTimersByTime(1001);

            // Should be allowed again
            expect(checkRateLimit(key, limit).success).toBe(true);
        });
    });

    describe('getClientIP', () => {
        it('should extract IP from x-forwarded-for header', () => {
            const request = new Request('http://localhost', {
                headers: {
                    'x-forwarded-for': '192.168.1.1, 10.0.0.1',
                },
            });

            expect(getClientIP(request)).toBe('192.168.1.1');
        });

        it('should return unknown for missing headers', () => {
            const request = new Request('http://localhost');
            expect(getClientIP(request)).toBe('unknown');
        });
    });

    describe('rateLimits presets', () => {
        it('should have correct auth limits', () => {
            expect(rateLimits.auth.maxRequests).toBe(5);
            expect(rateLimits.auth.windowMs).toBe(60000);
        });

        it('should have correct api limits', () => {
            expect(rateLimits.api.maxRequests).toBe(30);
        });

        it('should have correct sensitive limits', () => {
            expect(rateLimits.sensitive.maxRequests).toBe(10);
        });
    });
});

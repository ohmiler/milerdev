import { describe, it, expect, beforeEach, vi } from 'vitest';
import { checkRateLimit, rateLimits, getClientIP, getClientThrottleKey } from '@/lib/security/rate-limit';
import { throttleKeyForIP } from '@/lib/security/client-ip';

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

            expect(getClientIP(request)).toBe('10.0.0.1');
        });

        it('should return unknown for missing headers', () => {
            const request = new Request('http://localhost');
            expect(getClientIP(request)).toBe('unknown');
        });

        it('prefers the Railway x-real-ip contract over spoofable alternates', () => {
            const request = new Request('http://localhost', {
                headers: {
                    'x-real-ip': '203.0.113.10',
                    'x-client-ip': '198.51.100.20',
                    'fly-client-ip': '198.51.100.21',
                },
            });

            expect(getClientIP(request)).toBe('203.0.113.10');
        });

        it('does not trust alternate client IP headers by themselves', () => {
            const request = new Request('http://localhost', {
                headers: {
                    'x-client-ip': '198.51.100.20',
                    'fly-client-ip': '198.51.100.21',
                },
            });

            expect(getClientIP(request)).toBe('unknown');
        });
    });

    describe('throttle keys', () => {
        it('keeps an IPv4 address and unknown as they are', () => {
            expect(throttleKeyForIP('203.0.113.10')).toBe('203.0.113.10');
            expect(throttleKeyForIP('unknown')).toBe('unknown');
        });

        it('counts every address in one IPv6 /64 as one client', () => {
            const keys = ['2001:db8::1', '2001:db8::ffff:2', '2001:0db8:0000:0000:1234:5678:9abc:def0', '2001:db8:0:0::']
                .map(throttleKeyForIP);

            expect(new Set(keys)).toEqual(new Set(['2001:db8:0:0::/64']));
        });

        it('keeps different IPv6 /64 networks apart', () => {
            expect(throttleKeyForIP('2001:db8:0:1::1')).toBe('2001:db8:0:1::/64');
            expect(throttleKeyForIP('2001:db8:0:2::1')).toBe('2001:db8:0:2::/64');
            expect(throttleKeyForIP('::1')).toBe('0:0:0:0::/64');
            expect(throttleKeyForIP('fe80:1:2:3:4::')).toBe('fe80:1:2:3::/64');
        });

        it('derives the key from the same client address as getClientIP', () => {
            const request = new Request('http://localhost', { headers: { 'x-real-ip': '2001:DB8::42' } });

            expect(getClientIP(request)).toBe('2001:db8::42');
            expect(getClientThrottleKey(request)).toBe('2001:db8:0:0::/64');
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

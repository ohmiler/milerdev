import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

function makeRequest(
    pathname: string,
    init?: ConstructorParameters<typeof NextRequest>[1]
): NextRequest {
    return new NextRequest(new URL(pathname, 'http://localhost:3000'), init);
}

async function loadProxy() {
    vi.resetModules();
    return import('@/proxy');
}

describe('proxy', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('returns 404 before Next logs malformed Server Action probes', async () => {
        const { proxy } = await loadProxy();

        const response = proxy(
            makeRequest('/login', {
                method: 'POST',
                headers: {
                    'content-type': 'text/plain',
                    'next-action': 'x',
                },
            })
        );

        expect(response.status).toBe(404);
        expect(response.headers.get('content-type')).toContain('text/plain');
        expect(response.headers.get('x-milerdev-blocked')).toBe('invalid-server-action');
        expect(await response.text()).toBe('Server action not found.');
    });

    it('returns 404 before Next logs stale Server Action IDs from old deployments', async () => {
        const { proxy } = await loadProxy();

        const response = proxy(
            makeRequest('/login', {
                method: 'POST',
                headers: {
                    'content-type': 'text/plain',
                    'next-action': '311d876f8faf60d027a0bbd7cda38dfb758ba950',
                },
            })
        );

        expect(response.status).toBe(404);
        expect(response.headers.get('x-milerdev-blocked')).toBe('invalid-server-action');
        expect(await response.text()).toBe('Server action not found.');
    });

    it('blocks generic auth sign-in POSTs before Auth.js logs MissingCSRF', async () => {
        const { proxy } = await loadProxy();

        const response = proxy(
            makeRequest('/api/auth/signin', {
                method: 'POST',
                headers: {
                    'content-type': 'application/x-www-form-urlencoded',
                },
            })
        );

        expect(response.status).toBe(400);
        expect(response.headers.get('x-milerdev-blocked')).toBe('invalid-auth-signin');
        expect(await response.text()).toBe('Invalid auth request.');
    });

    it('continues provider-specific auth sign-in POSTs', async () => {
        const { proxy } = await loadProxy();

        const response = proxy(
            makeRequest('/api/auth/signin/google', {
                method: 'POST',
                headers: {
                    'content-type': 'application/x-www-form-urlencoded',
                },
            })
        );

        expect(response.status).toBe(200);
        expect(response.headers.get('x-milerdev-blocked')).toBeNull();
    });

    it('continues normal POST requests without a Server Action header', async () => {
        const { proxy } = await loadProxy();

        const response = proxy(
            makeRequest('/api/auth/callback/credentials', {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                    'x-forwarded-for': '203.0.113.24',
                },
            })
        );

        expect(response.status).toBe(200);
        expect(response.headers.get('x-milerdev-blocked')).toBeNull();
    });
});

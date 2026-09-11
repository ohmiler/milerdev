import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextAuthConfig } from 'next-auth';
import type { Adapter } from 'next-auth/adapters';
import { init } from '../../node_modules/@auth/core/lib/init.js';
import { callback } from '../../node_modules/@auth/core/lib/actions/callback/index.js';
import { createGoogleProvider } from '@/lib/auth-google';

const mocks = vi.hoisted(() => ({
    configure: undefined as undefined | ((request?: Request) => NextAuthConfig),
    createUser: vi.fn(),
    linkAccount: vi.fn(),
    findUser: vi.fn(),
    findAccount: vi.fn(),
    getUserByAccount: vi.fn(),
    handleOAuth: vi.fn(),
}));

vi.unmock('@/lib/auth');
vi.mock('next-auth', () => ({
    default: (configure: (request?: Request) => NextAuthConfig) => {
        mocks.configure = configure;
        return {};
    },
}));
vi.mock('@auth/drizzle-adapter', () => ({
    DrizzleAdapter: (): Adapter => ({
        createUser: mocks.createUser, linkAccount: mocks.linkAccount,
        getUserByAccount: mocks.getUserByAccount,
    }),
}));
vi.mock('@/lib/db', () => ({ db: { query: {
    users: { findFirst: mocks.findUser }, accounts: { findFirst: mocks.findAccount },
} } }));
vi.mock('@/lib/auth-rate-limit', () => ({ consumeAuthRateLimit: vi.fn() }));
vi.mock('../../node_modules/@auth/core/lib/actions/callback/oauth/callback.js', () => ({ handleOAuth: mocks.handleOAuth }));

import '@/lib/auth';

describe('auth configuration integration', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Unexpected network request')));
    });
    afterEach(() => vi.unstubAllGlobals());

    it.each([false, true])('redirects to recovery through initialized Auth.js with session cookie=%s', async (hasCookie) => {
        const cookie = hasCookie ? '__Secure-authjs.session-token.0=stale-cookie; ' : '';
        const request = new Request('https://example.test/api/auth/callback/google', {
            headers: { cookie: `${cookie}authjs.callback-url=${encodeURIComponent('https://example.test/courses/typescript')}` },
        });
        const config = mocks.configure!(request);
        mocks.findAccount.mockResolvedValue(null);
        mocks.getUserByAccount.mockResolvedValue(null);
        mocks.findUser.mockResolvedValue(hasCookie ? null : { deactivatedAt: null });
        mocks.handleOAuth.mockResolvedValue({
            user: { id: 'google-profile-id', email: 'owner@example.test' },
            account: { provider: 'google', providerAccountId: 'owner-google', type: 'oidc' },
            profile: { email: 'owner@example.test', email_verified: true }, cookies: [],
        });
        const { options } = await init({
            authOptions: {
                ...config, secret: 'test-secret-placeholder',
                providers: [createGoogleProvider({ clientId: 'test-client', clientSecret: 'test-placeholder' })],
            },
            url: new URL(request.url), providerId: 'google', action: 'callback',
            cookies: {}, isPost: false, csrfDisabled: true,
        });
        const result = await callback(
            { method: 'GET', query: {}, headers: {}, cookies: {} } as Parameters<typeof callback>[0],
            options,
            { value: hasCookie ? 'stale-cookie' : '' } as Parameters<typeof callback>[2],
            [],
        ).catch((error) => { throw error.cause?.err ?? error; });
        expect(result.redirect).toBe('https://example.test/login?callbackUrl=%2Fcourses%2Ftypescript&error=OAuthAccountNotLinked');
        expect(mocks.linkAccount).not.toHaveBeenCalled();
        expect(mocks.createUser).not.toHaveBeenCalled();
    });

    it('creates a separate linking capability for every lazy configuration call', async () => {
        expect(mocks.configure).toBeTypeOf('function');
        const first = mocks.configure!().adapter!;
        const second = mocks.configure!().adapter!;
        const user = { id: 'new-user', email: 'owner@example.test', emailVerified: null };
        mocks.createUser.mockResolvedValue(user);
        await first.createUser!(user);
        const account = { userId: user.id, provider: 'google', providerAccountId: 'owner-google', type: 'oidc' as const };
        await expect(second.linkAccount!(account)).rejects.toMatchObject({ type: 'OAuthAccountNotLinked' });
        await first.linkAccount!(account);
        expect(mocks.linkAccount).toHaveBeenCalledTimes(1);
    });

    it('passes the credential provider to the JWT proof check', async () => {
        mocks.findUser.mockResolvedValue({ role: 'student', sessionVersion: 3, deactivatedAt: null });
        const jwt = mocks.configure!().callbacks!.jwt!;
        const input = {
            token: { id: 'user-1', role: 'student', sessionVersion: 2 },
            user: { id: 'user-1', sessionVersion: 2 },
            account: { provider: 'credentials', providerAccountId: 'user-1', type: 'credentials' as const },
            trigger: 'signIn' as const,
        };
        await expect(jwt(input)).resolves.toBeNull();
        await expect(jwt({ ...input, user: { id: 'user-1', sessionVersion: 3 } }))
            .resolves.toMatchObject({ id: 'user-1', sessionVersion: 3 });
        await expect(jwt({
            ...input,
            user: { id: 'user-1' },
            account: { provider: 'google', providerAccountId: 'owner-google', type: 'oidc' },
        })).resolves.toMatchObject({ id: 'user-1', sessionVersion: 3 });
    });
});

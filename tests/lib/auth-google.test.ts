import { describe, expect, it, vi } from 'vitest';

import {
    authorizeGoogleSignIn,
    createGoogleProvider,
    getGoogleLinkingRequestContext,
    isTrustedGoogleProfile,
    normalizeGoogleCallbackIssuer,
} from '@/lib/auth-google';

describe('Google auth policy', () => {
    it('requires recovery instead of automatically linking matching email addresses', () => {
        const provider = createGoogleProvider({
            clientId: 'google-client-id',
            clientSecret: 'google-client-secret',
        });

        expect(provider.id).toBe('google');
        expect(provider.options?.allowDangerousEmailAccountLinking).toBe(false);
    });

    it('trusts only Google profiles with a verified email address', () => {
        expect(isTrustedGoogleProfile({ email: 'student@example.com', email_verified: true })).toBe(true);
        expect(isTrustedGoogleProfile({ email: 'student@example.com', email_verified: false })).toBe(false);
        expect(isTrustedGoogleProfile({ email_verified: true })).toBe(false);
    });

    it('normalizes missing or bare Google callback issuers', () => {
        const missingIssuerUrl = new URL('https://milerdev.com/api/auth/callback/google?code=abc&state=xyz');
        const bareIssuerUrl = new URL('https://milerdev.com/api/auth/callback/google?code=abc&state=xyz&iss=accounts.google.com');
        const unrelatedUrl = new URL('https://milerdev.com/login?iss=accounts.google.com');

        expect(normalizeGoogleCallbackIssuer(missingIssuerUrl)).toBe(true);
        expect(missingIssuerUrl.searchParams.get('iss')).toBe('https://accounts.google.com');

        expect(normalizeGoogleCallbackIssuer(bareIssuerUrl)).toBe(true);
        expect(bareIssuerUrl.searchParams.get('iss')).toBe('https://accounts.google.com');

        expect(normalizeGoogleCallbackIssuer(unrelatedUrl)).toBe(false);
        expect(unrelatedUrl.searchParams.get('iss')).toBe('accounts.google.com');
    });

    it.each([
        { linked: null, existing: null, cookie: false, expected: 'allow' },
        { linked: { deactivatedAt: null }, existing: null, cookie: true, expected: 'allow' },
        { linked: { deactivatedAt: new Date() }, existing: null, cookie: false, expected: 'deny' },
        { linked: null, existing: { deactivatedAt: null }, cookie: false, expected: 'recover' },
        { linked: null, existing: { deactivatedAt: new Date() }, cookie: false, expected: 'deny' },
        { linked: null, existing: null, cookie: true, expected: 'recover' },
    ])('returns $expected for linked=$linked existing=$existing cookie=$cookie', async ({ linked, existing, cookie, expected }) => {
        const profile = { email: 'student@example.com', email_verified: true };
        const loadLinkedUser = vi.fn().mockResolvedValue(linked);
        const loadUserByEmail = vi.fn().mockResolvedValue(existing);
        await expect(authorizeGoogleSignIn(profile, 'google-subject', {
            hasSessionCookie: cookie, loadLinkedUser, loadUserByEmail,
        })).resolves.toBe(expected);
        expect(loadLinkedUser).toHaveBeenCalledWith('google-subject');
        if (linked) expect(loadUserByEmail).not.toHaveBeenCalled();
    });

    it('fails Google sign-in closed on untrusted profiles or account lookup failure', async () => {
        const lookup = vi.fn().mockRejectedValue(new Error('database unavailable'));

        await expect(authorizeGoogleSignIn(
            { email: 'student@example.com', email_verified: false },
            'google-subject',
            { hasSessionCookie: false, loadLinkedUser: lookup, loadUserByEmail: lookup },
        )).resolves.toBe('deny');
        expect(lookup).not.toHaveBeenCalled();

        await expect(authorizeGoogleSignIn(
            { email: 'student@example.com', email_verified: true },
            'google-subject',
            { hasSessionCookie: false, loadLinkedUser: lookup, loadUserByEmail: lookup },
        )).resolves.toBe('deny');
    });

    it.each(['authjs.session-token', '__Secure-authjs.session-token', '__Secure-authjs.session-token.0'])
    ('treats %s presence as a linking restriction, not authentication', (cookieName) => {
        const request = new Request('https://example.test/api/auth/callback/google', {
            headers: { cookie: `${cookieName}=untrusted; authjs.callback-url=${encodeURIComponent('https://example.test/courses/typescript')}` },
        });
        expect(getGoogleLinkingRequestContext(request)).toEqual({
            hasSessionCookie: true,
            recoveryRedirect: '/login?callbackUrl=%2Fcourses%2Ftypescript&error=OAuthAccountNotLinked',
        });
    });

    it.each(['https://evil.test/courses/x', '//evil.test/courses/x', '/api/auth/signout', '/login', '%malformed'])
    ('rejects unsafe recovery destination %s', (destination) => {
        const context = getGoogleLinkingRequestContext(new Request('https://example.test/api/auth/callback/google', {
            headers: { cookie: `authjs.callback-url=${encodeURIComponent(destination)}; authjs.state=some-state` },
        }));
        expect(context.hasSessionCookie).toBe(false);
        expect(context.recoveryRedirect).toBe('/login?callbackUrl=%2Fdashboard&error=OAuthAccountNotLinked');
    });
});

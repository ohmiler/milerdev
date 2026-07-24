import { describe, expect, it, vi } from 'vitest';

import {
    authorizeGoogleSignIn,
    createGoogleProvider,
    isTrustedGoogleProfile,
    normalizeGoogleCallbackIssuer,
} from '@/lib/auth-google';

describe('Google auth policy', () => {
    it('enables account linking for the Google provider', () => {
        const provider = createGoogleProvider({
            clientId: 'google-client-id',
            clientSecret: 'google-client-secret',
        });

        expect(provider.id).toBe('google');
        expect(provider.options?.allowDangerousEmailAccountLinking).toBe(true);
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

    it('allows new and active Google identities but denies inactive existing users', async () => {
        const profile = { email: 'student@example.com', email_verified: true };

        await expect(authorizeGoogleSignIn(profile, undefined, async () => null)).resolves.toBe(true);
        await expect(authorizeGoogleSignIn(profile, 'user-1', async () => ({
            deactivatedAt: null,
        }))).resolves.toBe(true);
        await expect(authorizeGoogleSignIn(profile, 'user-1', async () => ({
            deactivatedAt: new Date('2026-07-24T00:00:00.000Z'),
        }))).resolves.toBe(false);
    });

    it('fails Google sign-in closed on untrusted profiles or account lookup failure', async () => {
        const lookup = vi.fn().mockRejectedValue(new Error('database unavailable'));

        await expect(authorizeGoogleSignIn(
            { email: 'student@example.com', email_verified: false },
            undefined,
            lookup,
        )).resolves.toBe(false);
        expect(lookup).not.toHaveBeenCalled();

        await expect(authorizeGoogleSignIn(
            { email: 'student@example.com', email_verified: true },
            undefined,
            lookup,
        )).resolves.toBe(false);
    });
});

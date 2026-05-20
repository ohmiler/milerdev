import Google, { type GoogleProfile } from 'next-auth/providers/google';

const GOOGLE_ISSUER = 'https://accounts.google.com';
const GOOGLE_BARE_ISSUER = 'accounts.google.com';

type GoogleProviderConfig = {
    clientId: string;
    clientSecret: string;
};

export function createGoogleProvider({ clientId, clientSecret }: GoogleProviderConfig) {
    return Google<GoogleProfile>({
        clientId,
        clientSecret,
        // Google includes email_verified in its signed OIDC profile. The signIn
        // callback still rejects unverified profiles before automatic linking.
        allowDangerousEmailAccountLinking: true,
    });
}

export function isTrustedGoogleProfile(profile: unknown): profile is Pick<GoogleProfile, 'email' | 'email_verified'> {
    if (!profile || typeof profile !== 'object') return false;

    const googleProfile = profile as Partial<GoogleProfile>;

    return typeof googleProfile.email === 'string' && googleProfile.email_verified === true;
}

export function normalizeGoogleCallbackIssuer(url: URL): boolean {
    if (!url.pathname.endsWith('/api/auth/callback/google')) return false;

    const issuer = url.searchParams.get('iss');
    if (issuer === GOOGLE_ISSUER) return false;
    if (issuer !== null && issuer !== '' && issuer !== GOOGLE_BARE_ISSUER) return false;

    url.searchParams.set('iss', GOOGLE_ISSUER);
    return true;
}

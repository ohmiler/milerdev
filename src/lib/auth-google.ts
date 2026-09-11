import Google, { type GoogleProfile } from 'next-auth/providers/google';
import { createAuthReturnHref, resolveSafeAuthReturn } from '@/lib/safe-auth-return';

const GOOGLE_ISSUER = 'https://accounts.google.com';
const GOOGLE_BARE_ISSUER = 'accounts.google.com';

type GoogleProviderConfig = {
    clientId: string;
    clientSecret: string;
};

type ExistingGoogleUserState = {
    deactivatedAt: Date | null;
};

type GoogleSignInDependencies = {
    hasSessionCookie: boolean;
    loadLinkedUser: (providerAccountId: string) => Promise<ExistingGoogleUserState | null | undefined>;
    loadUserByEmail: (email: string) => Promise<ExistingGoogleUserState | null | undefined>;
};

export function getGoogleLinkingRequestContext(request?: Pick<Request, 'headers' | 'url'>) {
    let hasSessionCookie = false;
    let returnTo: unknown;
    for (const cookie of request?.headers.get('cookie')?.split(';') ?? []) {
        const separator = cookie.indexOf('=');
        if (separator < 0) continue;
        const name = cookie.slice(0, separator).trim();
        if (/^(?:__Secure-)?authjs\.session-token(?:\.\d+)?$/.test(name)) {
            // Presence is only a reason to deny implicit linking, never proof
            // of identity. Include expired/revoked and chunked cookies.
            hasSessionCookie = true;
        }
        if (name === 'authjs.callback-url' || name === '__Secure-authjs.callback-url') {
            try {
                const value = decodeURIComponent(cookie.slice(separator + 1));
                const target = new URL(value, request!.url);
                returnTo = target.origin === new URL(request!.url).origin ? target.pathname : undefined;
            } catch {
                returnTo = undefined;
            }
        }
    }
    const { pathname } = resolveSafeAuthReturn(returnTo);
    return {
        hasSessionCookie,
        recoveryRedirect: `${createAuthReturnHref('/login', pathname)}&error=OAuthAccountNotLinked`,
    };
}

export function createGoogleProvider({ clientId, clientSecret }: GoogleProviderConfig) {
    return Google<GoogleProfile>({
        clientId,
        clientSecret,
        // A verified Google email does not prove ownership of an existing
        // password credential created before email ownership was established.
        allowDangerousEmailAccountLinking: false,
    });
}

export function isTrustedGoogleProfile(profile: unknown): profile is Pick<GoogleProfile, 'email' | 'email_verified'> {
    if (!profile || typeof profile !== 'object') return false;

    const googleProfile = profile as Partial<GoogleProfile>;

    return typeof googleProfile.email === 'string' && googleProfile.email_verified === true;
}

export async function authorizeGoogleSignIn(
    profile: unknown,
    providerAccountId: string,
    dependencies: GoogleSignInDependencies,
): Promise<'allow' | 'recover' | 'deny'> {
    if (!isTrustedGoogleProfile(profile) || !providerAccountId) return 'deny';

    try {
        const linkedUser = await dependencies.loadLinkedUser(providerAccountId);
        if (linkedUser) return linkedUser.deactivatedAt === null ? 'allow' : 'deny';

        const existingUser = await dependencies.loadUserByEmail(profile.email.toLowerCase().trim());
        if (existingUser && existingUser.deactivatedAt !== null) return 'deny';
        return existingUser || dependencies.hasSessionCookie ? 'recover' : 'allow';
    } catch {
        return 'deny';
    }
}

export function normalizeGoogleCallbackIssuer(url: URL): boolean {
    if (!url.pathname.endsWith('/api/auth/callback/google')) return false;

    const issuer = url.searchParams.get('iss');
    if (issuer === GOOGLE_ISSUER) return false;
    if (issuer !== null && issuer !== '' && issuer !== GOOGLE_BARE_ISSUER) return false;

    url.searchParams.set('iss', GOOGLE_ISSUER);
    return true;
}

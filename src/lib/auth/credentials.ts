import type { AuthRateLimitResult } from '@/lib/auth/rate-limit';
import { getClientThrottleKey } from '@/lib/security/client-ip';

type CredentialsInput = Partial<Record<'email' | 'password', unknown>>;

// Each email gets its own budget on top of the per-client one, so guessing one account's password
// cannot be sped up by rotating client addresses. Every attempt counts, for every email, whether or
// not the account exists, so the budget itself reveals nothing about which emails have accounts.
export const ACCOUNT_LOGIN_LIMIT = { maxRequests: 10, windowMs: 15 * 60_000 };

type CredentialUser = {
    id: string;
    email: string;
    name: string | null;
    role: string;
    passwordHash: string | null;
    deactivatedAt: Date | null;
    sessionVersion: number;
};

type AuthorizeCredentialsDependencies = {
    consumeRateLimit: (input: {
        namespace: string;
        identifier: string;
        maxRequests: number;
        windowMs: number;
    }) => Promise<AuthRateLimitResult>;
    findUserByEmail: (email: string) => Promise<CredentialUser | null | undefined>;
    comparePassword: (password: string, passwordHash: string) => Promise<boolean>;
};

export async function authorizeCredentials(
    credentials: CredentialsInput,
    request: Request,
    dependencies: AuthorizeCredentialsDependencies
) {
    if (
        typeof credentials.email !== 'string'
        || credentials.email.length === 0
        || typeof credentials.password !== 'string'
        || credentials.password.length === 0
    ) {
        return null;
    }

    const normalizedEmail = credentials.email.toLowerCase().trim();
    try {
        const clientLimit = await dependencies.consumeRateLimit({
            namespace: 'login',
            identifier: getClientThrottleKey(request),
            maxRequests: 10,
            windowMs: 60_000,
        });
        if (!clientLimit.success) return null;
        const accountLimit = await dependencies.consumeRateLimit({
            namespace: 'login-account',
            identifier: normalizedEmail,
            ...ACCOUNT_LOGIN_LIMIT,
        });
        if (!accountLimit.success) return null;
    } catch {
        return null;
    }

    let user: CredentialUser | null | undefined;
    try {
        user = await dependencies.findUserByEmail(normalizedEmail);
    } catch {
        return null;
    }
    if (!user?.passwordHash || user.deactivatedAt !== null) return null;
    const verifiedSessionVersion = user.sessionVersion;
    if (!Number.isSafeInteger(verifiedSessionVersion) || verifiedSessionVersion < 0) return null;

    let isValidPassword: boolean;
    try {
        isValidPassword = await dependencies.comparePassword(
            credentials.password,
            user.passwordHash
        );
    } catch {
        return null;
    }
    if (!isValidPassword) return null;

    return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        sessionVersion: verifiedSessionVersion,
    };
}

import type { AuthRateLimitResult } from '@/lib/auth/rate-limit';
import { getClientThrottleKey } from '@/lib/security/client-ip';

type CredentialsInput = Partial<Record<'email' | 'password', unknown>>;

// Each email gets its own budget on top of the per-client one, so guessing one account's password
// cannot be sped up by rotating client addresses. Every attempt counts, for every email, whether or
// not the account exists, so the budget itself reveals nothing about which emails have accounts.
export const ACCOUNT_LOGIN_LIMIT = { maxRequests: 10, windowMs: 15 * 60_000 };

// An argon2id hash, at the cost hashNewPassword uses, of a random value nobody kept. When an email
// has no usable password (no account, Google only, or deactivated), sign-in still verifies the
// guess against this hash, so it takes as long as a wrong password for a real account and the
// response time does not reveal which emails have password accounts. It never authenticates.
export const NO_ACCOUNT_PASSWORD_HASH = '$argon2id$v=19$m=19456,p=1,t=2$iD648l85vYqobZNDjj5rvA$4UL9TNGxJupT532bjr9u2TpK1S70anviA6qxcUFVuDI';

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
    if (!user?.passwordHash || user.deactivatedAt !== null) {
        await dependencies.comparePassword(credentials.password, NO_ACCOUNT_PASSWORD_HASH).catch(() => false);
        return null;
    }
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

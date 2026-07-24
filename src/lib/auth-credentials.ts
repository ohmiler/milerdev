import type { AuthRateLimitResult } from '@/lib/auth-rate-limit';
import { getClientIP } from '@/lib/client-ip';

type CredentialsInput = Partial<Record<'email' | 'password', unknown>>;

type CredentialUser = {
    id: string;
    email: string;
    name: string | null;
    role: string;
    passwordHash: string | null;
    deactivatedAt: Date | null;
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

    let rateLimit: AuthRateLimitResult;
    try {
        rateLimit = await dependencies.consumeRateLimit({
            namespace: 'login',
            identifier: getClientIP(request),
            maxRequests: 10,
            windowMs: 60_000,
        });
    } catch {
        return null;
    }

    if (!rateLimit.success) return null;

    const normalizedEmail = credentials.email.toLowerCase().trim();
    let user: CredentialUser | null | undefined;
    try {
        user = await dependencies.findUserByEmail(normalizedEmail);
    } catch {
        return null;
    }
    if (!user?.passwordHash || user.deactivatedAt !== null) return null;

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
    };
}

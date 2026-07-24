import type { DefaultSession, Session, User } from 'next-auth';
import type { JWT } from 'next-auth/jwt';

const AUTH_ROLES = new Set(['student', 'instructor', 'admin']);

export type AuthUserState = {
    role: string;
    sessionVersion: number;
    deactivatedAt: Date | null;
};

type ApplyJwtSessionPolicyParams = {
    token: JWT;
    user?: User;
    loadUserState: (userId: string) => Promise<AuthUserState | null | undefined>;
};

function isValidUserState(state: AuthUserState | null | undefined): state is AuthUserState {
    return !!state
        && AUTH_ROLES.has(state.role)
        && Number.isSafeInteger(state.sessionVersion)
        && state.sessionVersion >= 0
        && state.deactivatedAt === null;
}

function getTokenSessionVersion(token: JWT): number {
    return Number.isSafeInteger(token.sessionVersion) && token.sessionVersion >= 0
        ? token.sessionVersion
        : 0;
}

/**
 * Bind the encrypted JWT to current database authorization state.
 *
 * Returning null makes Auth.js discard the token. Database errors intentionally
 * fail closed so an embedded admin role never becomes an authorization fallback.
 */
export async function applyJwtSessionPolicy({
    token,
    user,
    loadUserState,
}: ApplyJwtSessionPolicyParams): Promise<JWT | null> {
    const userId = user?.id ?? (typeof token.id === 'string' ? token.id : null);
    if (!userId) return null;

    let currentState: AuthUserState | null | undefined;
    try {
        currentState = await loadUserState(userId);
    } catch {
        return null;
    }

    if (!isValidUserState(currentState)) return null;

    // Existing tokens created before sessionVersion was introduced behave as
    // version zero. Once credentials rotate to version one, they are rejected.
    if (!user && getTokenSessionVersion(token) !== currentState.sessionVersion) {
        return null;
    }

    token.id = userId;
    token.role = currentState.role;
    token.sessionVersion = currentState.sessionVersion;

    return token;
}

export function exposeAuthorizedSession(
    session: Session,
    token: JWT
): Session | DefaultSession {
    if (!session.user || typeof token.id !== 'string' || typeof token.role !== 'string') {
        return { ...session, user: undefined };
    }

    session.user.id = token.id;
    session.user.role = token.role;
    return session;
}

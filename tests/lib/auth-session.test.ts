import { describe, expect, it, vi } from 'vitest';
import type { Session, User } from 'next-auth';
import type { JWT } from 'next-auth/jwt';

import { applyJwtSessionPolicy, exposeAuthorizedSession } from '@/lib/auth-session';

function token(overrides: Partial<JWT> = {}): JWT {
    return {
        id: 'user-1',
        role: 'admin',
        sessionVersion: 0,
        ...overrides,
    } as JWT;
}

describe('JWT session policy', () => {
    it('loads role and session version from the database at sign-in', async () => {
        const loadUserState = vi.fn().mockResolvedValue({
            role: 'student',
            sessionVersion: 3,
            deactivatedAt: null,
        });

        const result = await applyJwtSessionPolicy({
            token: token({ role: 'admin', sessionVersion: 99 }),
            user: { id: 'user-1' } as User,
            loadUserState,
        });

        expect(loadUserState).toHaveBeenCalledWith('user-1');
        expect(result).toMatchObject({
            id: 'user-1',
            role: 'student',
            sessionVersion: 3,
        });
    });

    it('accepts a pre-migration token only while the database version is zero', async () => {
        const loadUserState = vi.fn().mockResolvedValue({
            role: 'student',
            sessionVersion: 0,
            deactivatedAt: null,
        });

        const result = await applyJwtSessionPolicy({
            token: token({ sessionVersion: undefined }),
            loadUserState,
        });

        expect(result).toMatchObject({ sessionVersion: 0 });
    });

    it('rejects a stale token after credential rotation', async () => {
        const loadUserState = vi.fn().mockResolvedValue({
            role: 'student',
            sessionVersion: 2,
            deactivatedAt: null,
        });

        const result = await applyJwtSessionPolicy({
            token: token({ sessionVersion: 1 }),
            loadUserState,
        });

        expect(result).toBeNull();
    });

    it('refreshes a demoted administrator role immediately', async () => {
        const loadUserState = vi.fn().mockResolvedValue({
            role: 'student',
            sessionVersion: 0,
            deactivatedAt: null,
        });

        const result = await applyJwtSessionPolicy({
            token: token({ role: 'admin' }),
            loadUserState,
        });

        expect(result).toMatchObject({ role: 'student' });
    });

    it('fails closed when the account no longer exists', async () => {
        const result = await applyJwtSessionPolicy({
            token: token(),
            loadUserState: vi.fn().mockResolvedValue(null),
        });

        expect(result).toBeNull();
    });

    it('rejects an inactive account even during a new sign-in callback', async () => {
        const result = await applyJwtSessionPolicy({
            token: token(),
            user: { id: 'user-1' } as User,
            loadUserState: vi.fn().mockResolvedValue({
                role: 'student',
                sessionVersion: 4,
                deactivatedAt: new Date('2026-07-24T00:00:00.000Z'),
            }),
        });

        expect(result).toBeNull();
    });

    it('does not restore a token issued before deactivate-reactivate rotation', async () => {
        const result = await applyJwtSessionPolicy({
            token: token({ sessionVersion: 3 }),
            loadUserState: vi.fn().mockResolvedValue({
                role: 'student',
                sessionVersion: 5,
                deactivatedAt: null,
            }),
        });

        expect(result).toBeNull();
    });

    it('fails closed when current account state cannot be loaded', async () => {
        const result = await applyJwtSessionPolicy({
            token: token(),
            loadUserState: vi.fn().mockRejectedValue(new Error('database unavailable')),
        });

        expect(result).toBeNull();
    });

    it('exposes only the database-authorized identity and role to the session', () => {
        const session = {
            user: { id: '', role: '', name: 'Student' },
            expires: new Date(Date.now() + 60_000).toISOString(),
        } as Session;

        expect(exposeAuthorizedSession(session, token({ role: 'student' }))).toMatchObject({
            user: { id: 'user-1', role: 'student', name: 'Student' },
        });
    });
});

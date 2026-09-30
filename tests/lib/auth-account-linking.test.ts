import { describe, expect, it, vi } from 'vitest';
import type { Adapter, AdapterAccount, AdapterUser } from 'next-auth/adapters';

// Exercise the installed Auth.js state machine, including its cookie path.
// Deliberately relative: this internal module is not a public package export.
import { handleLoginOrRegister } from '../../node_modules/@auth/core/lib/actions/callback/handle-login.js';
import { restrictAccountLinking } from '@/lib/auth-account-linking';
import { createGoogleProvider } from '@/lib/auth-google';

const existing: AdapterUser = {
    id: 'pre-registered-user', email: 'owner@example.test',
    name: 'Pre-registered', emailVerified: null,
};
const identity = { provider: 'google', providerAccountId: 'owner-google', type: 'oidc' as const };

function setup({ collision = false, linked = false, cookieVersion = 0 } = {}) {
    const writes: AdapterAccount[] = [];
    const base: Adapter = {
        createUser: vi.fn(async (data) => ({ ...data, id: 'new-user' })),
        getUser: vi.fn(async () => existing),
        getUserByEmail: vi.fn(async () => collision ? existing : null),
        getUserByAccount: vi.fn(async () => linked ? existing : null),
        linkAccount: vi.fn(async (account) => { writes.push(account); }),
    };
    const adapter = restrictAccountLinking(base);
    const provider = createGoogleProvider({ clientId: 'test-client', clientSecret: 'test-placeholder' });
    const options = {
        adapter,
        provider: { ...provider, ...provider.options, account: () => ({}) },
        session: { strategy: 'jwt' },
        jwt: { decode: vi.fn(async () => ({ sub: existing.id, sessionVersion: cookieVersion })) },
        cookies: { sessionToken: { name: 'authjs.session-token' } },
        events: {},
    } as unknown as Parameters<typeof handleLoginOrRegister>[3];
    const login = (cookie = '', email = existing.email) => handleLoginOrRegister(
        cookie, { email, name: 'Google owner' }, identity, options,
    );
    return { base, adapter, writes, login, options };
}

describe('Auth.js Google linking boundary', () => {
    it('rejects the pre-registration collision before linking or creating a session', async () => {
        const state = setup({ collision: true });
        await expect(state.login()).rejects.toMatchObject({ type: 'OAuthAccountNotLinked' });
        expect(state.writes).toEqual([]);
        expect(state.base.createUser).not.toHaveBeenCalled();
    });

    it.each([0, 4])('denies a new identity through a cookie at version %i', async (cookieVersion) => {
        const state = setup({ cookieVersion });
        // Auth.js decodes both active and revoked cookies without our JWT policy.
        await expect(state.login('encrypted-cookie', 'attacker-google@example.test'))
            .rejects.toMatchObject({ type: 'OAuthAccountNotLinked' });
        expect(state.base.getUser).toHaveBeenCalledWith(existing.id);
        expect(state.writes).toEqual([]);
        expect(state.base.createUser).not.toHaveBeenCalled();
    });

    it('creates a new Google user and its first link', async () => {
        const state = setup();
        const result = await state.login();
        expect(result).toMatchObject({ user: { id: 'new-user' }, isNewUser: true });
        expect(state.writes).toEqual([expect.objectContaining({ ...identity, userId: 'new-user' })]);
    });

    it.each(['', 'encrypted-cookie'])('preserves existing linked Google login with cookie %s', async (cookie) => {
        const state = setup({ linked: true });
        // Provider identity remains authoritative even if the profile email changed.
        const result = await state.login(cookie, 'changed-email@example.test');
        expect(result.user.id).toBe(existing.id);
        expect(state.writes).toEqual([]);
        expect(state.base.createUser).not.toHaveBeenCalled();
    });

    it('does not transfer an identity already linked to another user', async () => {
        const state = setup({ linked: true });
        vi.mocked(state.base.getUser!).mockResolvedValue({ ...existing, id: 'different-session-user' });
        await expect(state.login('encrypted-cookie')).rejects.toMatchObject({ type: 'OAuthAccountNotLinked' });
        expect(state.writes).toEqual([]);
    });

    it('does not grant a link after concurrent registration wins the unique email insert', async () => {
        const state = setup();
        vi.mocked(state.base.createUser!).mockRejectedValue(new Error('duplicate email'));
        await expect(state.login()).rejects.toThrow('duplicate email');
        expect(state.writes).toEqual([]);
        await expect(state.adapter.linkAccount!({ ...identity, userId: existing.id }))
            .rejects.toMatchObject({ type: 'OAuthAccountNotLinked' });
    });

    it('isolates creation permission between requests and consumes it once', async () => {
        const state = setup();
        const otherRequest = restrictAccountLinking(state.base);
        const created = await state.adapter.createUser!(existing);
        const account = { ...identity, userId: created.id };
        await expect(otherRequest.linkAccount!(account)).rejects.toMatchObject({ type: 'OAuthAccountNotLinked' });
        const results = await Promise.allSettled([
            state.adapter.linkAccount!(account), state.adapter.linkAccount!(account),
        ]);
        expect(results.map((result) => result.status)).toEqual(['fulfilled', 'rejected']);
        expect(state.writes).toHaveLength(1);
    });

    it('cannot reuse creation permission after account persistence fails', async () => {
        const state = setup();
        vi.mocked(state.base.linkAccount!).mockRejectedValue(new Error('database unavailable'));
        // A new wrapper captures the failing adapter method.
        const adapter = restrictAccountLinking(state.base);
        const created = await adapter.createUser!(existing);
        const account = { ...identity, userId: created.id };
        await expect(adapter.linkAccount!(account)).rejects.toThrow('database unavailable');
        await expect(adapter.linkAccount!(account)).rejects.toMatchObject({ type: 'OAuthAccountNotLinked' });
    });
});

import { OAuthAccountNotLinked } from '@auth/core/errors';
import type { Adapter } from 'next-auth/adapters';

/**
 * Create one wrapper per auth request, never at module scope. Auth.js can link
 * an OAuth identity to the user from a session cookie without running our JWT
 * policy first. Only a user created by this request may receive an initial link.
 * Existing linked identities sign in through getUserByAccount, not linkAccount.
 */
export function restrictAccountLinking(adapter: Adapter): Adapter {
    const { createUser, linkAccount } = adapter;
    if (!createUser || !linkAccount) {
        throw new Error('Account linking requires a user and account adapter');
    }

    const newUserIds = new Set<string>();

    return {
        ...adapter,
        async createUser(user) {
            const created = await createUser(user);
            newUserIds.add(created.id);
            return created;
        },
        async linkAccount(account) {
            // Consume before awaiting persistence: retries cannot add another
            // identity, and a different request never inherits this permission.
            if (!newUserIds.delete(account.userId)) {
                throw new OAuthAccountNotLinked('Account linking requires account recovery');
            }
            await linkAccount(account);
        },
    };
}

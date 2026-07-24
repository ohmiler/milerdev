import { describe, expect, it } from 'vitest';

import {
    UserLifecycleError,
    createUserLifecycleService,
    type LifecycleAuditEntry,
    type LifecycleUserRecord,
    type UserLifecycleStore,
    type UserLifecycleTransaction,
    type UserMutationExpectation,
    type UserMutationPatch,
} from '@/lib/user-lifecycle';

const auditContext = { ipAddress: null, userAgent: 'vitest' };

class InMemoryLifecycleStore implements UserLifecycleStore {
    users = new Map<string, LifecycleUserRecord>();
    audits: LifecycleAuditEntry[] = [];
    linkedRows = new Map<string, string[]>();
    failAudit = false;
    private queue = Promise.resolve();

    constructor(users: LifecycleUserRecord[]) {
        for (const user of users) this.users.set(user.id, structuredClone(user));
    }

    async transaction<T>(work: (tx: UserLifecycleTransaction) => Promise<T>): Promise<T> {
        const previous = this.queue;
        let release: () => void = () => undefined;
        this.queue = new Promise<void>((resolve) => {
            release = resolve;
        });
        await previous;

        const userSnapshot = structuredClone(this.users);
        const auditSnapshot = structuredClone(this.audits);
        const tx: UserLifecycleTransaction = {
            lockActiveAdmins: async () => [...this.users.values()]
                .filter((user) => user.role === 'admin' && user.deactivatedAt === null)
                .sort((left, right) => left.id.localeCompare(right.id)),
            lockUsers: async (ids) => ids
                .map((id) => this.users.get(id))
                .filter((user): user is LifecycleUserRecord => Boolean(user))
                .map((user) => structuredClone(user)),
            updateUser: async (id, expected, patch) => this.updateUser(id, expected, patch),
            insertAudit: async (entry) => {
                if (this.failAudit) throw new Error('audit unavailable');
                this.audits.push(structuredClone(entry));
            },
        };

        try {
            return await work(tx);
        } catch (error) {
            this.users = userSnapshot;
            this.audits = auditSnapshot;
            throw error;
        } finally {
            release();
        }
    }

    private async updateUser(
        id: string,
        expected: UserMutationExpectation,
        patch: UserMutationPatch,
    ): Promise<number> {
        const user = this.users.get(id);
        if (!user) return 0;
        if (expected.role !== undefined && user.role !== expected.role) return 0;
        if (
            expected.deactivatedAt !== undefined
            && user.deactivatedAt?.getTime() !== expected.deactivatedAt?.getTime()
        ) return 0;

        if (patch.role !== undefined) user.role = patch.role;
        if (patch.name !== undefined) user.name = patch.name;
        if (patch.deactivatedAt !== undefined) user.deactivatedAt = patch.deactivatedAt;
        if (patch.incrementSessionVersion) user.sessionVersion += 1;
        if (patch.clearResetCredentials) {
            user.resetToken = null;
            user.resetExpires = null;
        }
        return 1;
    }
}

function user(
    id: string,
    role: LifecycleUserRecord['role'],
    deactivatedAt: Date | null = null,
): LifecycleUserRecord {
    return {
        id,
        name: id,
        role,
        deactivatedAt,
        sessionVersion: 3,
        resetToken: 'reset-token',
        resetExpires: new Date('2026-07-25T00:00:00.000Z'),
    };
}

describe('user lifecycle service', () => {
    it('deactivates only active targets, clears recovery, audits, and converges on retry', async () => {
        const store = new InMemoryLifecycleStore([
            user('admin-a', 'admin'),
            user('student-a', 'student'),
            user('student-b', 'student', new Date('2026-07-20T00:00:00.000Z')),
        ]);
        store.linkedRows.set('student-a', ['enrollment-1', 'certificate-1', 'payment-1']);
        const service = createUserLifecycleService(store);

        const first = await service.setLifecycle({
            actorId: 'admin-a',
            targetIds: ['student-a', 'student-b'],
            action: 'deactivate',
            auditContext,
        });
        const retry = await service.setLifecycle({
            actorId: 'admin-a',
            targetIds: ['student-a', 'student-b'],
            action: 'deactivate',
            auditContext,
        });

        expect(first).toMatchObject({ requestedCount: 2, matchedCount: 2, changedCount: 1, skippedCount: 1 });
        expect(retry).toMatchObject({ changedCount: 0, skippedCount: 2 });
        expect(first.users).toEqual([
            expect.objectContaining({ id: 'student-a', lifecycleStatus: 'inactive' }),
            expect.objectContaining({ id: 'student-b', lifecycleStatus: 'inactive' }),
        ]);
        expect(retry.users).toEqual(first.users);
        expect(store.users.get('student-a')).toMatchObject({
            sessionVersion: 4,
            resetToken: null,
            resetExpires: null,
        });
        expect(store.users.get('student-a')?.deactivatedAt).toBeInstanceOf(Date);
        expect(store.audits).toHaveLength(1);
        expect(store.linkedRows.get('student-a')).toEqual([
            'enrollment-1',
            'certificate-1',
            'payment-1',
        ]);
    });

    it('rolls the lifecycle mutation back when its audit write fails', async () => {
        const store = new InMemoryLifecycleStore([
            user('admin-a', 'admin'),
            user('student-a', 'student'),
        ]);
        store.failAudit = true;
        const service = createUserLifecycleService(store);

        await expect(service.setLifecycle({
            actorId: 'admin-a',
            targetIds: ['student-a'],
            action: 'deactivate',
            auditContext,
        })).rejects.toThrow('audit unavailable');

        expect(store.users.get('student-a')).toMatchObject({
            deactivatedAt: null,
            sessionVersion: 3,
            resetToken: 'reset-token',
        });
        expect(store.audits).toHaveLength(0);
    });

    it('serializes cross-deactivation so one active admin always remains', async () => {
        const store = new InMemoryLifecycleStore([
            user('admin-a', 'admin'),
            user('admin-b', 'admin'),
        ]);
        const service = createUserLifecycleService(store);

        const results = await Promise.allSettled([
            service.setLifecycle({
                actorId: 'admin-a',
                targetIds: ['admin-b'],
                action: 'deactivate',
                auditContext,
            }),
            service.setLifecycle({
                actorId: 'admin-b',
                targetIds: ['admin-a'],
                action: 'deactivate',
                auditContext,
            }),
        ]);

        expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
        expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
        expect([...store.users.values()].filter(
            (candidate) => candidate.role === 'admin' && candidate.deactivatedAt === null
        )).toHaveLength(1);
    });

    it('serializes cross-demotion and rejects the request whose actor lost authority', async () => {
        const store = new InMemoryLifecycleStore([
            user('admin-a', 'admin'),
            user('admin-b', 'admin'),
        ]);
        const service = createUserLifecycleService(store);

        const results = await Promise.allSettled([
            service.updateRoles({
                actorId: 'admin-a',
                targetIds: ['admin-b'],
                role: 'student',
                auditContext,
            }),
            service.updateRoles({
                actorId: 'admin-b',
                targetIds: ['admin-a'],
                role: 'student',
                auditContext,
            }),
        ]);

        expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
        expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
        expect([...store.users.values()].filter(
            (candidate) => candidate.role === 'admin' && candidate.deactivatedAt === null
        )).toHaveLength(1);
    });

    it('rejects self-deactivation and a bulk role change that removes every other active admin', async () => {
        const store = new InMemoryLifecycleStore([
            user('admin-a', 'admin'),
            user('admin-b', 'admin'),
        ]);
        const service = createUserLifecycleService(store);

        await expect(service.setLifecycle({
            actorId: 'admin-a',
            targetIds: ['admin-a'],
            action: 'deactivate',
            auditContext,
        })).rejects.toMatchObject({ code: 'SELF_ACTION' });

        await service.updateRoles({
            actorId: 'admin-a',
            targetIds: ['admin-b'],
            role: 'student',
            auditContext,
        });
        await expect(service.updateRoles({
            actorId: 'admin-a',
            targetIds: ['admin-a'],
            role: 'student',
            auditContext,
        })).rejects.toBeInstanceOf(UserLifecycleError);

        expect([...store.users.values()].filter(
            (candidate) => candidate.role === 'admin' && candidate.deactivatedAt === null
        )).toHaveLength(1);
    });

    it('returns authoritative post-mutation state for role and profile updates', async () => {
        const store = new InMemoryLifecycleStore([
            user('admin-a', 'admin'),
            user('student-a', 'student', new Date('2026-07-20T00:00:00.000Z')),
        ]);
        const service = createUserLifecycleService(store);

        const roleResult = await service.updateRoles({
            actorId: 'admin-a',
            targetIds: ['student-a'],
            role: 'instructor',
            auditContext,
        });
        const profileResult = await service.updateUser({
            actorId: 'admin-a',
            targetId: 'student-a',
            name: 'Updated learner',
            auditContext,
        });

        expect(roleResult.users).toEqual([
            expect.objectContaining({
                id: 'student-a',
                role: 'instructor',
                lifecycleStatus: 'inactive',
            }),
        ]);
        expect(profileResult.users).toEqual([
            expect.objectContaining({
                id: 'student-a',
                name: 'Updated learner',
                role: 'instructor',
                lifecycleStatus: 'inactive',
            }),
        ]);
    });
});

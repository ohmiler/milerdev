import { and, asc, eq, inArray, isNull, sql } from 'drizzle-orm';

import {
    createAuditLogValues,
    type AuditContext,
    type AuditLogParams,
} from '@/lib/auditLog';
import { db } from '@/lib/db';
import { auditLogs, users } from '@/lib/db/schema';

export type UserRole = 'student' | 'instructor' | 'admin';
export type LifecycleAction = 'deactivate' | 'reactivate';

export type LifecycleUserRecord = {
    id: string;
    name: string | null;
    role: UserRole;
    deactivatedAt: Date | null;
    sessionVersion: number;
    resetToken: string | null;
    resetExpires: Date | null;
};

export type UserMutationExpectation = {
    role?: UserRole;
    deactivatedAt?: Date | null;
};

export type UserMutationPatch = {
    name?: string;
    role?: UserRole;
    deactivatedAt?: Date | null;
    incrementSessionVersion?: boolean;
    clearResetCredentials?: boolean;
};

export type LifecycleAuditEntry = AuditLogParams & { context: AuditContext };

export interface UserLifecycleTransaction {
    lockActiveAdmins(): Promise<LifecycleUserRecord[]>;
    lockUsers(ids: string[]): Promise<LifecycleUserRecord[]>;
    updateUser(
        id: string,
        expected: UserMutationExpectation,
        patch: UserMutationPatch,
    ): Promise<number>;
    insertAudit(entry: LifecycleAuditEntry): Promise<void>;
}

export interface UserLifecycleStore {
    transaction<T>(work: (tx: UserLifecycleTransaction) => Promise<T>): Promise<T>;
}

type LifecycleErrorCode =
    | 'INVALID_TARGETS'
    | 'ACTOR_FORBIDDEN'
    | 'SELF_ACTION'
    | 'USER_NOT_FOUND'
    | 'LAST_ACTIVE_ADMIN'
    | 'STATE_CONFLICT';

export class UserLifecycleError extends Error {
    constructor(
        readonly code: LifecycleErrorCode,
        readonly status: 400 | 403 | 404 | 409,
    ) {
        super(code);
        this.name = 'UserLifecycleError';
    }
}

export type UserLifecycleMutationResult = {
    requestedCount: number;
    matchedCount: number;
    changedCount: number;
    skippedCount: number;
    users: UserLifecycleState[];
};

export type UserLifecycleState = {
    id: string;
    name: string | null;
    role: UserRole;
    lifecycleStatus: 'active' | 'inactive';
    deactivatedAt: Date | null;
};

function uniqueTargetIds(targetIds: string[]): string[] {
    const ids = [...new Set(targetIds)].sort();
    if (
        ids.length === 0
        || ids.length > 100
        || ids.some((id) => typeof id !== 'string' || id.length === 0 || id.length > 36)
    ) {
        throw new UserLifecycleError('INVALID_TARGETS', 400);
    }
    return ids;
}

function requireActiveAdmin(
    activeAdmins: LifecycleUserRecord[],
    actorId: string,
): void {
    if (!activeAdmins.some((admin) => admin.id === actorId)) {
        throw new UserLifecycleError('ACTOR_FORBIDDEN', 403);
    }
}

function requireAllTargets(
    targets: LifecycleUserRecord[],
    targetIds: string[],
): void {
    if (targets.length !== targetIds.length) {
        throw new UserLifecycleError('USER_NOT_FOUND', 404);
    }
}

function requireRemainingActiveAdmin(
    activeAdmins: LifecycleUserRecord[],
    removedAdminIds: Set<string>,
): void {
    const remaining = activeAdmins.filter((admin) => !removedAdminIds.has(admin.id));
    if (remaining.length === 0) {
        throw new UserLifecycleError('LAST_ACTIVE_ADMIN', 409);
    }
}

function requireAffectedRow(affectedRows: number): void {
    if (affectedRows !== 1) {
        throw new UserLifecycleError('STATE_CONFLICT', 409);
    }
}

function lifecycleState(
    user: LifecycleUserRecord,
    patch: Pick<UserMutationPatch, 'name' | 'role' | 'deactivatedAt'> = {},
): UserLifecycleState {
    const deactivatedAt = patch.deactivatedAt === undefined
        ? user.deactivatedAt
        : patch.deactivatedAt;
    return {
        id: user.id,
        name: patch.name === undefined ? user.name : patch.name,
        role: patch.role === undefined ? user.role : patch.role,
        lifecycleStatus: deactivatedAt === null ? 'active' : 'inactive',
        deactivatedAt,
    };
}

function result(
    requestedCount: number,
    changedCount: number,
    users: UserLifecycleState[],
): UserLifecycleMutationResult {
    return {
        requestedCount,
        matchedCount: requestedCount,
        changedCount,
        skippedCount: requestedCount - changedCount,
        users,
    };
}

export function createUserLifecycleService(store: UserLifecycleStore) {
    return {
        async setLifecycle({
            actorId,
            targetIds,
            action,
            auditContext,
        }: {
            actorId: string;
            targetIds: string[];
            action: LifecycleAction;
            auditContext: AuditContext;
        }): Promise<UserLifecycleMutationResult> {
            const ids = uniqueTargetIds(targetIds);

            return store.transaction(async (tx) => {
                const activeAdmins = await tx.lockActiveAdmins();
                requireActiveAdmin(activeAdmins, actorId);
                if (action === 'deactivate' && ids.includes(actorId)) {
                    throw new UserLifecycleError('SELF_ACTION', 400);
                }
                const targets = await tx.lockUsers(ids);
                requireAllTargets(targets, ids);

                const candidates = targets.filter((target) => (
                    action === 'deactivate'
                        ? target.deactivatedAt === null
                        : target.deactivatedAt !== null
                ));

                if (action === 'deactivate') {
                    requireRemainingActiveAdmin(
                        activeAdmins,
                        new Set(candidates
                            .filter((target) => target.role === 'admin')
                            .map((target) => target.id)),
                    );
                }

                const changedAt = new Date();
                for (const target of candidates) {
                    const patch: UserMutationPatch = action === 'deactivate'
                        ? {
                            deactivatedAt: changedAt,
                            incrementSessionVersion: true,
                            clearResetCredentials: true,
                        }
                        : {
                            deactivatedAt: null,
                            incrementSessionVersion: true,
                        };
                    const affectedRows = await tx.updateUser(
                        target.id,
                        { role: target.role, deactivatedAt: target.deactivatedAt },
                        patch,
                    );
                    requireAffectedRow(affectedRows);
                    await tx.insertAudit({
                        userId: actorId,
                        action: 'update',
                        entityType: 'user',
                        entityId: target.id,
                        oldValue: action === 'deactivate' ? 'lifecycle:active' : 'lifecycle:inactive',
                        newValue: action === 'deactivate' ? 'lifecycle:inactive' : 'lifecycle:active',
                        context: auditContext,
                    });
                }

                const candidateIds = new Set(candidates.map((target) => target.id));
                return result(
                    ids.length,
                    candidates.length,
                    targets.map((target) => lifecycleState(
                        target,
                        candidateIds.has(target.id)
                            ? { deactivatedAt: action === 'deactivate' ? changedAt : null }
                            : {},
                    )),
                );
            });
        },

        async updateRoles({
            actorId,
            targetIds,
            role,
            auditContext,
        }: {
            actorId: string;
            targetIds: string[];
            role: UserRole;
            auditContext: AuditContext;
        }): Promise<UserLifecycleMutationResult> {
            const ids = uniqueTargetIds(targetIds);

            return store.transaction(async (tx) => {
                const activeAdmins = await tx.lockActiveAdmins();
                requireActiveAdmin(activeAdmins, actorId);
                if (role !== 'admin' && ids.includes(actorId)) {
                    throw new UserLifecycleError('SELF_ACTION', 400);
                }
                const targets = await tx.lockUsers(ids);
                requireAllTargets(targets, ids);
                const candidates = targets.filter((target) => target.role !== role);

                if (role !== 'admin') {
                    requireRemainingActiveAdmin(
                        activeAdmins,
                        new Set(candidates
                            .filter((target) => target.role === 'admin' && target.deactivatedAt === null)
                            .map((target) => target.id)),
                    );
                }

                for (const target of candidates) {
                    const affectedRows = await tx.updateUser(
                        target.id,
                        { role: target.role, deactivatedAt: target.deactivatedAt },
                        { role },
                    );
                    requireAffectedRow(affectedRows);
                    await tx.insertAudit({
                        userId: actorId,
                        action: 'update',
                        entityType: 'user',
                        entityId: target.id,
                        oldValue: `role:${target.role}`,
                        newValue: `role:${role}`,
                        context: auditContext,
                    });
                }

                const candidateIds = new Set(candidates.map((target) => target.id));
                return result(
                    ids.length,
                    candidates.length,
                    targets.map((target) => lifecycleState(
                        target,
                        candidateIds.has(target.id) ? { role } : {},
                    )),
                );
            });
        },

        async updateUser({
            actorId,
            targetId,
            name,
            role,
            auditContext,
        }: {
            actorId: string;
            targetId: string;
            name?: string;
            role?: UserRole;
            auditContext: AuditContext;
        }): Promise<UserLifecycleMutationResult> {
            const [id] = uniqueTargetIds([targetId]);

            return store.transaction(async (tx) => {
                const activeAdmins = await tx.lockActiveAdmins();
                requireActiveAdmin(activeAdmins, actorId);
                if (role !== undefined && role !== 'admin' && id === actorId) {
                    throw new UserLifecycleError('SELF_ACTION', 400);
                }
                const targets = await tx.lockUsers([id]);
                requireAllTargets(targets, [id]);
                const target = targets[0];
                const roleChanged = role !== undefined && role !== target.role;
                const nameChanged = name !== undefined && name !== target.name;

                if (roleChanged && role !== 'admin' && target.role === 'admin' && target.deactivatedAt === null) {
                    requireRemainingActiveAdmin(activeAdmins, new Set([target.id]));
                }
                if (!roleChanged && !nameChanged) {
                    return result(1, 0, [lifecycleState(target)]);
                }

                const affectedRows = await tx.updateUser(
                    id,
                    { role: target.role, deactivatedAt: target.deactivatedAt },
                    {
                        ...(nameChanged ? { name } : {}),
                        ...(roleChanged ? { role } : {}),
                    },
                );
                requireAffectedRow(affectedRows);
                await tx.insertAudit({
                    userId: actorId,
                    action: 'update',
                    entityType: 'user',
                    entityId: id,
                    oldValue: roleChanged
                        ? `role:${target.role}${nameChanged ? ';name:redacted' : ''}`
                        : 'profile:name-redacted',
                    newValue: roleChanged
                        ? `role:${role}${nameChanged ? ';name:updated' : ''}`
                        : 'profile:name-updated',
                    context: auditContext,
                });
                return result(1, 1, [lifecycleState(target, {
                    ...(nameChanged ? { name } : {}),
                    ...(roleChanged ? { role } : {}),
                })]);
            });
        },
    };
}

type DatabaseTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

function getAffectedRows(databaseResult: unknown): number {
    const candidate = Array.isArray(databaseResult) ? databaseResult[0] : databaseResult;
    if (!candidate || typeof candidate !== 'object' || !('affectedRows' in candidate)) return 0;
    const affectedRows = Number((candidate as { affectedRows: unknown }).affectedRows);
    return Number.isFinite(affectedRows) ? affectedRows : 0;
}

function selectLifecycleFields() {
    return {
        id: users.id,
        name: users.name,
        role: users.role,
        deactivatedAt: users.deactivatedAt,
        sessionVersion: users.sessionVersion,
        resetToken: users.resetToken,
        resetExpires: users.resetExpires,
    };
}

function createTransactionAdapter(tx: DatabaseTransaction): UserLifecycleTransaction {
    return {
        async lockActiveAdmins() {
            return tx
                .select(selectLifecycleFields())
                .from(users)
                .where(and(eq(users.role, 'admin'), isNull(users.deactivatedAt)))
                .orderBy(asc(users.id))
                .for('update');
        },
        async lockUsers(ids) {
            return tx
                .select(selectLifecycleFields())
                .from(users)
                .where(inArray(users.id, ids))
                .orderBy(asc(users.id))
                .for('update');
        },
        async updateUser(id, expected, patch) {
            const conditions = [eq(users.id, id)];
            if (expected.role !== undefined) conditions.push(eq(users.role, expected.role));
            if (expected.deactivatedAt !== undefined) {
                conditions.push(expected.deactivatedAt === null
                    ? isNull(users.deactivatedAt)
                    : eq(users.deactivatedAt, expected.deactivatedAt));
            }

            const values: {
                name?: string;
                role?: UserRole;
                deactivatedAt?: Date | null;
                sessionVersion?: ReturnType<typeof sql>;
                resetToken?: null;
                resetExpires?: null;
                updatedAt: Date;
            } = { updatedAt: new Date() };
            if (patch.name !== undefined) values.name = patch.name;
            if (patch.role !== undefined) values.role = patch.role;
            if (patch.deactivatedAt !== undefined) values.deactivatedAt = patch.deactivatedAt;
            if (patch.incrementSessionVersion) {
                values.sessionVersion = sql`${users.sessionVersion} + 1`;
            }
            if (patch.clearResetCredentials) {
                values.resetToken = null;
                values.resetExpires = null;
            }

            return getAffectedRows(await tx
                .update(users)
                .set(values)
                .where(and(...conditions)));
        },
        async insertAudit(entry) {
            const { context, ...params } = entry;
            await tx.insert(auditLogs).values(createAuditLogValues(params, context));
        },
    };
}

const drizzleLifecycleStore: UserLifecycleStore = {
    transaction(work) {
        return db.transaction((tx) => work(createTransactionAdapter(tx)));
    },
};

export const userLifecycleService = createUserLifecycleService(drizzleLifecycleStore);

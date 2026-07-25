import { and, asc, eq, isNull } from 'drizzle-orm';

import {
    createAuditLogValues,
    type AuditContext,
    type AuditLogParams,
} from '@/lib/auditLog';
import { db } from '@/lib/db';
import {
    auditLogs,
    bundleCourses,
    bundles,
    courses,
    users,
} from '@/lib/db/schema';

export type CourseStatus = 'draft' | 'published' | 'archived';
export type CourseLifecycleAction = 'archive' | 'restore' | 'publish';

export type CourseLifecycleRecord = {
    id: string;
    slug: string;
    title: string;
    status: CourseStatus;
};

export type PublishedBundleReference = {
    id: string;
    title: string;
};

export type CourseLifecycleAuditEntry = AuditLogParams & { context: AuditContext };

export interface CourseLifecycleTransaction {
    lockActiveAdmin(actorId: string): Promise<boolean>;
    lockCourse(courseId: string): Promise<CourseLifecycleRecord | null>;
    lockPublishedBundles(courseId: string): Promise<PublishedBundleReference[]>;
    updateCourseStatus(
        courseId: string,
        expectedStatus: CourseStatus,
        nextStatus: CourseStatus,
    ): Promise<number>;
    insertAudit(entry: CourseLifecycleAuditEntry): Promise<void>;
}

export interface CourseLifecycleStore {
    transaction<T>(work: (tx: CourseLifecycleTransaction) => Promise<T>): Promise<T>;
}

type CourseLifecycleErrorCode =
    | 'INVALID_TARGET'
    | 'ACTOR_FORBIDDEN'
    | 'COURSE_NOT_FOUND'
    | 'INVALID_TRANSITION'
    | 'STATE_CONFLICT'
    | 'PUBLISHED_BUNDLE_DEPENDENCY';

export class CourseLifecycleError extends Error {
    constructor(
        readonly code: CourseLifecycleErrorCode,
        readonly status: 400 | 403 | 404 | 409,
        readonly blockingBundles: PublishedBundleReference[] = [],
    ) {
        super(code);
        this.name = 'CourseLifecycleError';
    }
}

export type CourseLifecycleMutationResult = {
    changedCount: number;
    skippedCount: number;
    course: CourseLifecycleRecord;
};

const transitionTargets: Record<CourseLifecycleAction, CourseStatus> = {
    archive: 'archived',
    restore: 'draft',
    publish: 'published',
};

const transitionSources: Record<CourseLifecycleAction, CourseStatus[]> = {
    archive: ['draft', 'published'],
    restore: ['archived'],
    publish: ['draft'],
};

function requireCourseId(courseId: string): string {
    if (
        typeof courseId !== 'string'
        || courseId.length === 0
        || courseId.length > 36
    ) {
        throw new CourseLifecycleError('INVALID_TARGET', 400);
    }
    return courseId;
}

function requireAffectedRow(affectedRows: number): void {
    if (affectedRows !== 1) {
        throw new CourseLifecycleError('STATE_CONFLICT', 409);
    }
}

function result(
    course: CourseLifecycleRecord,
    status: CourseStatus,
    changedCount: number,
): CourseLifecycleMutationResult {
    return {
        changedCount,
        skippedCount: changedCount === 0 ? 1 : 0,
        course: { ...course, status },
    };
}

export function createCourseLifecycleService(store: CourseLifecycleStore) {
    return {
        async transition({
            actorId,
            courseId,
            action,
            expectedStatus,
            auditContext,
        }: {
            actorId: string;
            courseId: string;
            action: CourseLifecycleAction;
            expectedStatus?: CourseStatus;
            auditContext: AuditContext;
        }): Promise<CourseLifecycleMutationResult> {
            const id = requireCourseId(courseId);

            return store.transaction(async (tx) => {
                if (!await tx.lockActiveAdmin(actorId)) {
                    throw new CourseLifecycleError('ACTOR_FORBIDDEN', 403);
                }

                const course = await tx.lockCourse(id);
                if (!course) {
                    throw new CourseLifecycleError('COURSE_NOT_FOUND', 404);
                }

                const nextStatus = transitionTargets[action];
                if (course.status === nextStatus) {
                    return result(course, nextStatus, 0);
                }
                if (expectedStatus !== undefined && course.status !== expectedStatus) {
                    throw new CourseLifecycleError('STATE_CONFLICT', 409);
                }
                if (!transitionSources[action].includes(course.status)) {
                    throw new CourseLifecycleError('INVALID_TRANSITION', 409);
                }

                if (action === 'archive') {
                    const blockingBundles = await tx.lockPublishedBundles(id);
                    if (blockingBundles.length > 0) {
                        throw new CourseLifecycleError(
                            'PUBLISHED_BUNDLE_DEPENDENCY',
                            409,
                            blockingBundles,
                        );
                    }
                }

                requireAffectedRow(await tx.updateCourseStatus(id, course.status, nextStatus));
                await tx.insertAudit({
                    userId: actorId,
                    action: 'update',
                    entityType: 'course',
                    entityId: id,
                    oldValue: `lifecycle:${course.status}`,
                    newValue: `lifecycle:${nextStatus}`,
                    context: auditContext,
                });
                return result(course, nextStatus, 1);
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

function createTransactionAdapter(tx: DatabaseTransaction): CourseLifecycleTransaction {
    return {
        async lockActiveAdmin(actorId) {
            const rows = await tx
                .select({ id: users.id })
                .from(users)
                .where(and(
                    eq(users.id, actorId),
                    eq(users.role, 'admin'),
                    isNull(users.deactivatedAt),
                ))
                .for('update');
            return rows.length === 1;
        },
        async lockCourse(courseId) {
            const rows = await tx
                .select({
                    id: courses.id,
                    slug: courses.slug,
                    title: courses.title,
                    status: courses.status,
                })
                .from(courses)
                .where(eq(courses.id, courseId))
                .for('update');
            return rows[0] ?? null;
        },
        lockPublishedBundles(courseId) {
            return tx
                .select({
                    id: bundles.id,
                    title: bundles.title,
                })
                .from(bundleCourses)
                .innerJoin(bundles, eq(bundleCourses.bundleId, bundles.id))
                .where(and(
                    eq(bundleCourses.courseId, courseId),
                    eq(bundles.status, 'published'),
                ))
                .orderBy(asc(bundles.id))
                .for('update');
        },
        async updateCourseStatus(courseId, expectedStatus, nextStatus) {
            return getAffectedRows(await tx
                .update(courses)
                .set({ status: nextStatus, updatedAt: new Date() })
                .where(and(
                    eq(courses.id, courseId),
                    eq(courses.status, expectedStatus),
                )));
        },
        async insertAudit(entry) {
            const { context, ...params } = entry;
            await tx.insert(auditLogs).values(createAuditLogValues(params, context));
        },
    };
}

const drizzleCourseLifecycleStore: CourseLifecycleStore = {
    transaction(work) {
        return db.transaction((tx) => work(createTransactionAdapter(tx)));
    },
};

export const courseLifecycleService = createCourseLifecycleService(
    drizzleCourseLifecycleStore,
);

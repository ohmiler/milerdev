import { and, asc, eq, inArray, isNull } from 'drizzle-orm';

import { createAuditLogValues, type AuditContext } from '@/lib/auditLog';
import { requirePublishedBundleCourses } from '@/lib/bundle-commerce';
import { db } from '@/lib/db';
import {
  auditLogs,
  bundleCourses,
  bundles,
  courses,
  users,
} from '@/lib/db/schema';

export type BundleStatus = 'draft' | 'published' | 'archived';

export type BundleMutationInput = {
  title: string;
  slug: string;
  description: string | null;
  thumbnailUrl: string | null;
  price: string;
  status: BundleStatus;
  courseIds: string[];
};

export type BundleMutationErrorCode =
  | 'ACTOR_FORBIDDEN'
  | 'BUNDLE_NOT_FOUND'
  | 'BUNDLE_COURSES_INVALID'
  | 'BUNDLE_CHILD_NOT_PUBLISHED';

export class BundleMutationError extends Error {
  constructor(
    readonly code: BundleMutationErrorCode,
    readonly status: 403 | 404 | 409,
    readonly blockingCourseIds: string[] = [],
  ) {
    super(code);
    this.name = 'BundleMutationError';
  }
}

type DatabaseTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function lockActiveAdmin(tx: DatabaseTransaction, actorId: string) {
  const rows = await tx
    .select({ id: users.id })
    .from(users)
    .where(and(
      eq(users.id, actorId),
      eq(users.role, 'admin'),
      isNull(users.deactivatedAt),
    ))
    .for('update');
  if (rows.length !== 1) throw new BundleMutationError('ACTOR_FORBIDDEN', 403);
}

function normalizeCourseIds(courseIds: string[]): string[] {
  return [...new Set(courseIds)].sort();
}

async function lockSelectedCourses(
  tx: DatabaseTransaction,
  selectedIds: string[],
  requirePublished: boolean,
) {
  if (selectedIds.length < 2) {
    throw new BundleMutationError('BUNDLE_COURSES_INVALID', 409);
  }

  const rows = await tx
    .select({ id: courses.id, status: courses.status })
    .from(courses)
    .where(inArray(courses.id, selectedIds))
    .orderBy(asc(courses.id))
    .for('update');

  if (rows.length !== selectedIds.length) {
    throw new BundleMutationError('BUNDLE_COURSES_INVALID', 409);
  }
  if (requirePublished) {
    try {
      requirePublishedBundleCourses(rows);
    } catch (error) {
      if (error instanceof Error && 'blockingCourseIds' in error) {
        throw new BundleMutationError(
          'BUNDLE_CHILD_NOT_PUBLISHED',
          409,
          (error as { blockingCourseIds: string[] }).blockingCourseIds,
        );
      }
      throw error;
    }
  }
}

async function insertMemberships(
  tx: DatabaseTransaction,
  bundleId: string,
  courseIds: string[],
) {
  await tx.insert(bundleCourses).values(courseIds.map((courseId, orderIndex) => ({
    id: crypto.randomUUID(),
    bundleId,
    courseId,
    orderIndex,
  })));
}

function bundleValues(input: BundleMutationInput) {
  return {
    title: input.title,
    slug: input.slug,
    description: input.description,
    thumbnailUrl: input.thumbnailUrl,
    price: input.price,
    status: input.status,
  };
}

export async function createBundleWithIntegrity({
  actorId,
  bundleId,
  input,
  auditContext,
}: {
  actorId: string;
  bundleId: string;
  input: BundleMutationInput;
  auditContext: AuditContext;
}) {
  const courseIds = [...input.courseIds];
  const lockOrder = normalizeCourseIds(courseIds);
  return db.transaction(async (tx) => {
    await lockActiveAdmin(tx, actorId);
    await lockSelectedCourses(tx, lockOrder, true);
    await tx.insert(bundles).values({ id: bundleId, ...bundleValues(input) });
    await insertMemberships(tx, bundleId, courseIds);
    await tx.insert(auditLogs).values(createAuditLogValues({
      userId: actorId,
      action: 'create',
      entityType: 'bundle',
      entityId: bundleId,
      newValue: `lifecycle:${input.status}`,
    }, auditContext));
    return { bundleId };
  });
}

export async function updateBundleWithIntegrity({
  actorId,
  bundleId,
  input,
  auditContext,
}: {
  actorId: string;
  bundleId: string;
  input: BundleMutationInput;
  auditContext: AuditContext;
}) {
  const courseIds = [...input.courseIds];
  const lockOrder = normalizeCourseIds(courseIds);
  return db.transaction(async (tx) => {
    await lockActiveAdmin(tx, actorId);
    // Course rows are always locked before the Bundle row. Course archive uses the
    // same course -> Bundle order, preventing a publish/archive race or deadlock.
    await lockSelectedCourses(tx, lockOrder, true);
    const [existing] = await tx
      .select({ id: bundles.id, status: bundles.status })
      .from(bundles)
      .where(eq(bundles.id, bundleId))
      .for('update');
    if (!existing) throw new BundleMutationError('BUNDLE_NOT_FOUND', 404);

    await tx.update(bundles).set({ ...bundleValues(input), updatedAt: new Date() })
      .where(eq(bundles.id, bundleId));
    await tx.delete(bundleCourses).where(eq(bundleCourses.bundleId, bundleId));
    await insertMemberships(tx, bundleId, courseIds);
    await tx.insert(auditLogs).values(createAuditLogValues({
      userId: actorId,
      action: 'update',
      entityType: 'bundle',
      entityId: bundleId,
      oldValue: `lifecycle:${existing.status}`,
      newValue: `lifecycle:${input.status}`,
    }, auditContext));
    return { bundleId };
  });
}

import 'server-only';

import { createId } from '@paralleldrive/cuid2';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { auditLogs, courses, enrollments, users } from '@/lib/db/schema';
import { createAuditLogValues, type AuditContext } from '@/lib/auditLog';

export const enrollmentAccessChangeSchema = z.object({
  reason: z.string().trim().min(5).max(500),
});
export const adminEnrollmentGrantSchema = z.object({
  userId: z.string().trim().min(1).max(36),
  courseId: z.string().trim().min(1).max(36),
});

type Database = Pick<typeof db, 'transaction'>;
type Actor = { actorId: string; context: AuditContext };

// Keep the enrollment identity and completion facts: revocation changes access,
// not learning history. Audit failure rolls back the access change as well.
export async function changeAdminEnrollmentAccess(
  input: Actor & { enrollmentId: string; action: 'revoke' | 'restore'; reason: string },
  database: Database = db,
) {
  const { reason } = enrollmentAccessChangeSchema.parse(input);
  return database.transaction(async (tx) => {
    const [enrollment] = await tx.select().from(enrollments)
      .where(eq(enrollments.id, input.enrollmentId)).limit(1).for('update');
    if (!enrollment) return { kind: 'not_found' } as const;
    const revoked = Boolean(enrollment.revokedAt);
    if (revoked === (input.action === 'revoke')) return { kind: 'unchanged', enrollmentId: enrollment.id } as const;
    await tx.update(enrollments).set({ revokedAt: input.action === 'revoke' ? new Date() : null })
      .where(eq(enrollments.id, enrollment.id));
    await tx.insert(auditLogs).values(createAuditLogValues({
      userId: input.actorId, action: 'update', entityType: 'enrollment', entityId: enrollment.id,
      oldValue: JSON.stringify({ access: revoked ? 'revoked' : 'active' }),
      newValue: JSON.stringify({ access: input.action === 'revoke' ? 'revoked' : 'active', reason }),
    }, input.context));
    return { kind: input.action === 'revoke' ? 'revoked' : 'restored', enrollmentId: enrollment.id } as const;
  });
}

export async function grantAdminEnrollment(
  input: Actor & { userId: string; courseId: string; importHistory?: { enrolledAt: Date; progressPercent: number; completedAt: Date | null } },
  database: Database = db,
) {
  const { userId, courseId } = adminEnrollmentGrantSchema.parse(input);
  return database.transaction(async (tx) => {
    // Serialize manual grants for a member, including the absent-enrollment case.
    const [user] = await tx.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1).for('update');
    if (!user) return { kind: 'user_not_found' } as const;
    const [course] = await tx.select({ id: courses.id }).from(courses).where(eq(courses.id, courseId)).limit(1);
    if (!course) return { kind: 'course_not_found' } as const;
    const [existing] = await tx.select().from(enrollments)
      .where(and(eq(enrollments.userId, userId), eq(enrollments.courseId, courseId))).limit(1).for('update');
    // Bulk imports never override an explicit revocation or existing history.
    if (existing && (!existing.revokedAt || input.importHistory)) {
      return { kind: 'existing', enrollmentId: existing.id } as const;
    }
    let enrollmentId = existing?.id;
    if (existing) {
      await tx.update(enrollments).set({ revokedAt: null }).where(eq(enrollments.id, existing.id));
    } else {
      enrollmentId = createId();
      await tx.insert(enrollments).values({ id: enrollmentId, userId, courseId, ...input.importHistory });
    }
    await tx.insert(auditLogs).values(createAuditLogValues({
      userId: input.actorId, action: existing ? 'update' : 'create', entityType: 'enrollment', entityId: enrollmentId,
      oldValue: existing ? JSON.stringify({ access: 'revoked' }) : null,
      newValue: JSON.stringify({ access: 'active', reason: input.importHistory ? 'admin_import' : 'explicit_admin_grant' }),
    }, input.context));
    return { kind: existing ? 'restored' : 'created', enrollmentId: enrollmentId! } as const;
  });
}

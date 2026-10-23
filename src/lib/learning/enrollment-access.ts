import 'server-only';

import { createId } from '@paralleldrive/cuid2';
import { and, eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { enrollments } from '@/lib/db/schema';
import { isDuplicateKeyError } from '@/lib/db/safe-insert';

// An admin revocation keeps the enrollment row with revoked_at set. Access means a row whose
// revoked_at is null. Learner grant paths only ever insert, so the unique (user, course) row
// stops a completed payment, a Stripe return replay or a free enroll from restoring it; only
// grantCourseAccessByAdmin clears it.

/** Shown when a learner tries to enroll in or pay for a course an admin withdrew. */
export const ACCESS_WITHDRAWN_MESSAGE = 'สิทธิ์เรียนคอร์สนี้ถูกระงับโดยผู้ดูแล กรุณาติดต่อเราก่อนชำระเงินหรือลงทะเบียนอีกครั้ง';
export const BUNDLE_ACCESS_WITHDRAWN_MESSAGE = 'สิทธิ์เรียนบางคอร์สในชุดนี้ถูกระงับโดยผู้ดูแล กรุณาติดต่อเราก่อนชำระเงินหรือลงทะเบียน';

export type AdminGrantResult = {
  status: 'created' | 'restored' | 'already_active';
  enrollmentId: string;
};

/**
 * An admin's explicit grant: creates the enrollment, or restores a revoked one with its progress,
 * enrollment date and completion intact.
 */
export async function grantCourseAccessByAdmin(userId: string, courseId: string): Promise<AdminGrantResult> {
  const where = and(eq(enrollments.userId, userId), eq(enrollments.courseId, courseId));
  const [existing] = await db
    .select({ id: enrollments.id, revokedAt: enrollments.revokedAt })
    .from(enrollments)
    .where(where)
    .limit(1);
  if (existing) {
    if (!existing.revokedAt) return { status: 'already_active', enrollmentId: existing.id };
    await db.update(enrollments).set({ revokedAt: null }).where(eq(enrollments.id, existing.id));
    return { status: 'restored', enrollmentId: existing.id };
  }

  const enrollmentId = createId();
  try {
    await db.insert(enrollments).values({ id: enrollmentId, userId, courseId, enrolledAt: new Date(), progressPercent: 0 });
    return { status: 'created', enrollmentId };
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error;
    // Another request created it between the read and the insert; grant whatever is there now.
    return grantCourseAccessByAdmin(userId, courseId);
  }
}

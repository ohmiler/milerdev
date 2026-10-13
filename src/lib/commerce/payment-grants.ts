import { and, eq, ne, sql } from 'drizzle-orm';

import { db } from '@/lib/db';
import { paymentCourseGrants, payments } from '@/lib/db/schema';

type DatabaseTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Executor = typeof db | DatabaseTransaction;

/**
 * Records that a bundle payment granted these courses, so a refund can revoke exactly what the
 * payment granted even after the bundle's membership changes or the bundle is deleted. A repeat
 * grant (a replay) is a no-op. Call it on every path that grants a bundle payment's courses.
 */
export async function recordPaymentCourseGrants(
  executor: Executor,
  paymentId: string,
  courseIds: readonly string[],
): Promise<void> {
  if (courseIds.length === 0) return;
  await executor
    .insert(paymentCourseGrants)
    .values(courseIds.map((courseId) => ({ paymentId, courseId })))
    // Only the (payment_id, course_id) unique key can collide; keep the existing row.
    .onDuplicateKeyUpdate({ set: { paymentId: sql`${paymentCourseGrants.paymentId}` } });
}

/** The courses a payment was recorded as granting. */
export async function grantedCourseIds(executor: Executor, paymentId: string): Promise<string[]> {
  const rows = await executor
    .select({ courseId: paymentCourseGrants.courseId })
    .from(paymentCourseGrants)
    .where(eq(paymentCourseGrants.paymentId, paymentId));
  return rows.map((row) => row.courseId);
}

/** Whether another completed payment of this user is recorded as granting the course. */
export async function hasOtherRecordedGrant(
  executor: Executor,
  { userId, courseId, excludingPaymentId }: { userId: string; courseId: string; excludingPaymentId: string },
): Promise<boolean> {
  const [row] = await executor
    .select({ count: sql<number>`count(*)` })
    .from(paymentCourseGrants)
    .innerJoin(payments, eq(paymentCourseGrants.paymentId, payments.id))
    .where(and(
      eq(payments.userId, userId),
      eq(paymentCourseGrants.courseId, courseId),
      eq(payments.status, 'completed'),
      ne(payments.id, excludingPaymentId),
    ));
  return Number(row?.count ?? 0) > 0;
}

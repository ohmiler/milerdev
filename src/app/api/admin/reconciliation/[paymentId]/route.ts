import { NextResponse } from 'next/server';
import { and, desc, eq, sql } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { MAX_RECONCILIATION_RETRIES } from '@/lib/commerce/reconciliation';
import { db } from '@/lib/db';
import { auditLogs, bundleCourses, enrollments, payments, users } from '@/lib/db/schema';

const HISTORY_LIMIT = 10;

// GET /api/admin/reconciliation/[paymentId] - Everything a reviewer needs before deciding.
// Read-only: it never changes a payment or grants access.
export async function GET(
    _request: Request,
    { params }: { params: Promise<{ paymentId: string }> },
) {
    try {
        const session = await auth();
        if (!session?.user || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { paymentId } = await params;
        const [payment] = await db
            .select({
                id: payments.id,
                userId: payments.userId,
                courseId: payments.courseId,
                bundleId: payments.bundleId,
                amount: payments.amount,
                currency: payments.currency,
                method: payments.method,
                status: payments.status,
                itemTitle: payments.itemTitle,
                promptpayTransRef: payments.promptpayTransRef,
                retryCount: payments.retryCount,
                lastRetryAt: payments.lastRetryAt,
                createdAt: payments.createdAt,
                payerName: users.name,
                payerEmail: users.email,
            })
            .from(payments)
            .leftJoin(users, eq(payments.userId, users.id))
            .where(eq(payments.id, paymentId))
            .limit(1);

        if (!payment) {
            return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
        }

        const [entitlement, history] = await Promise.all([
            readEntitlement(payment),
            db
                .select({
                    id: auditLogs.id,
                    action: auditLogs.action,
                    oldValue: auditLogs.oldValue,
                    newValue: auditLogs.newValue,
                    createdAt: auditLogs.createdAt,
                    actorName: users.name,
                })
                .from(auditLogs)
                .leftJoin(users, eq(auditLogs.userId, users.id))
                .where(and(eq(auditLogs.entityType, 'payment'), eq(auditLogs.entityId, paymentId)))
                .orderBy(desc(auditLogs.createdAt))
                .limit(HISTORY_LIMIT),
        ]);

        const retryCount = payment.retryCount ?? 0;
        return NextResponse.json({
            payment: {
                id: payment.id,
                status: payment.status,
                method: payment.method,
                amount: payment.amount,
                currency: payment.currency,
                itemTitle: payment.itemTitle,
                itemType: payment.bundleId ? 'bundle' : payment.courseId ? 'course' : null,
                createdAt: payment.createdAt,
                retryCount,
                lastRetryAt: payment.lastRetryAt,
                // The slip image is never stored; only the bank reference from a verified slip can exist.
                transactionReference: payment.promptpayTransRef,
            },
            payer: payment.userId ? { name: payment.payerName, email: payment.payerEmail } : null,
            entitlement,
            // Only the review facts; IP address and user agent stay out of the response.
            history: history.map((entry) => ({
                id: entry.id,
                action: entry.action,
                oldValue: entry.oldValue,
                newValue: entry.newValue,
                createdAt: entry.createdAt,
                actorName: entry.actorName,
            })),
            decision: {
                canDecide: payment.method === 'promptpay'
                    && (payment.status === 'verifying' || payment.status === 'failed')
                    && retryCount < MAX_RECONCILIATION_RETRIES,
                maxRetries: MAX_RECONCILIATION_RETRIES,
            },
        });
    } catch (error) {
        console.error('Error reading reconciliation case:', error);
        return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
    }
}

type EntitlementSummary =
    | { kind: 'course'; total: 1; enrolled: number }
    | { kind: 'bundle'; total: number; enrolled: number }
    | { kind: 'unknown' };

async function readEntitlement(payment: {
    userId: string | null;
    courseId: string | null;
    bundleId: string | null;
}): Promise<EntitlementSummary> {
    const { userId, courseId, bundleId } = payment;
    if (!userId || Boolean(courseId) === Boolean(bundleId)) return { kind: 'unknown' };

    if (courseId) {
        const [row] = await db
            .select({ enrolled: sql<number>`COUNT(*)` })
            .from(enrollments)
            .where(and(eq(enrollments.userId, userId), eq(enrollments.courseId, courseId)));
        return { kind: 'course', total: 1, enrolled: Number(row?.enrolled || 0) > 0 ? 1 : 0 };
    }

    const [totalRow, enrolledRow] = await Promise.all([
        db
            .select({ total: sql<number>`COUNT(*)` })
            .from(bundleCourses)
            .where(eq(bundleCourses.bundleId, bundleId as string)),
        db
            .select({ enrolled: sql<number>`COUNT(*)` })
            .from(enrollments)
            .innerJoin(bundleCourses, eq(enrollments.courseId, bundleCourses.courseId))
            .where(and(eq(enrollments.userId, userId), eq(bundleCourses.bundleId, bundleId as string))),
    ]);
    return {
        kind: 'bundle',
        total: Number(totalRow[0]?.total || 0),
        enrolled: Number(enrolledRow[0]?.enrolled || 0),
    };
}

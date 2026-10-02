import { NextResponse } from 'next/server';
import { and, asc, eq, gte, like, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { auditLogs, payments, users, courses, bundles } from '@/lib/db/schema';
import { logError } from '@/lib/error-handler';

const bulkReconciliationSchema = z.object({
    action: z.literal('mark_failed'),
    paymentIds: z.array(z.string().min(1)).min(1).max(50),
    reason: z.string().trim().min(5).max(500),
}).strict();

// Route modules may only export handlers, so the UI keeps its own copy of this page size.
const RECONCILIATION_PAGE_SIZE = 50;

const reconciliationQuerySchema = z.object({
    status: z.enum(['verifying', 'failed', 'pending']).default('verifying'),
    // "all" lets reviewers reach work items older than the 90 day window.
    days: z.union([z.literal('all'), z.coerce.number().int().min(1).max(90)]).default(30),
    page: z.coerce.number().int().min(1).max(100_000).default(1),
    q: z.string().trim().max(100).optional(),
});

class BulkReconciliationConflict extends Error {}

function escapeLike(value: string): string {
    return value.replace(/[\\%_]/g, '\\$&');
}

function getAffectedRows(result: unknown): number | null {
    const candidate = Array.isArray(result) ? result[0] : result;
    if (!candidate || typeof candidate !== 'object' || !('affectedRows' in candidate)) return null;
    const affectedRows = Number((candidate as { affectedRows: unknown }).affectedRows);
    return Number.isFinite(affectedRows) ? affectedRows : null;
}

// GET /api/admin/reconciliation - List payments needing reconciliation
export async function GET(request: Request) {
    try {
        const session = await auth();
        if (!session?.user || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const parsedQuery = reconciliationQuerySchema.safeParse(Object.fromEntries(searchParams));
        if (!parsedQuery.success) {
            return NextResponse.json({ error: 'พารามิเตอร์ไม่ถูกต้อง' }, { status: 400 });
        }
        const { status, days, page } = parsedQuery.data;
        const query = parsedQuery.data.q || undefined;

        const sinceCondition = days === 'all'
            ? undefined
            : gte(payments.createdAt, new Date(Date.now() - days * 24 * 60 * 60 * 1000));
        const searchCondition = query
            ? or(
                like(payments.id, `${escapeLike(query)}%`),
                like(users.email, `%${escapeLike(query)}%`),
            )
            : undefined;
        const listWhere = and(
            eq(payments.status, status),
            eq(payments.method, 'promptpay'),
            sinceCondition,
            searchCondition,
        );

        const [results, [countRow], [summary]] = await Promise.all([
            db
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
                    slipUrl: payments.slipUrl,
                    retryCount: payments.retryCount,
                    lastRetryAt: payments.lastRetryAt,
                    createdAt: payments.createdAt,
                    userName: users.name,
                    userEmail: users.email,
                    courseTitle: courses.title,
                    bundleTitle: bundles.title,
                })
                .from(payments)
                .leftJoin(users, eq(payments.userId, users.id))
                .leftJoin(courses, eq(payments.courseId, courses.id))
                .leftJoin(bundles, eq(payments.bundleId, bundles.id))
                .where(listWhere)
                // Oldest first so the longest-waiting case is handled first; id keeps pages stable on ties.
                .orderBy(asc(payments.createdAt), asc(payments.id))
                .limit(RECONCILIATION_PAGE_SIZE)
                .offset((page - 1) * RECONCILIATION_PAGE_SIZE),
            db
                .select({ total: sql<number>`COUNT(*)` })
                .from(payments)
                .leftJoin(users, eq(payments.userId, users.id))
                .where(listWhere),
            // Summary covers the selected time window for every status; it ignores the search text.
            db
                .select({
                    verifying: sql<number>`SUM(CASE WHEN ${payments.status} = 'verifying' THEN 1 ELSE 0 END)`,
                    failed: sql<number>`SUM(CASE WHEN ${payments.status} = 'failed' THEN 1 ELSE 0 END)`,
                    pending: sql<number>`SUM(CASE WHEN ${payments.status} = 'pending' THEN 1 ELSE 0 END)`,
                })
                .from(payments)
                .where(and(eq(payments.method, 'promptpay'), sinceCondition)),
        ]);

        const total = Number(countRow?.total || 0);

        return NextResponse.json({
            payments: results,
            summary: {
                verifying: Number(summary?.verifying || 0),
                failed: Number(summary?.failed || 0),
                pending: Number(summary?.pending || 0),
            },
            pagination: {
                page,
                pageSize: RECONCILIATION_PAGE_SIZE,
                total,
                totalPages: Math.max(1, Math.ceil(total / RECONCILIATION_PAGE_SIZE)),
            },
            filter: { status, days, q: query ?? null },
        });
    } catch (error) {
        logError(error, { action: 'admin.reconciliation.fetch_failed' });
        return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
    }
}

// POST /api/admin/reconciliation - Bulk action on payments
export async function POST(request: Request) {
    try {
        const session = await auth();
        if (!session?.user || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const parsedBody = bulkReconciliationSchema.safeParse(
            await request.json().catch(() => null),
        );
        if (!parsedBody.success) {
            return NextResponse.json(
                { error: 'กรุณาเลือก 1-50 รายการและระบุเหตุผลอย่างน้อย 5 ตัวอักษร' },
                { status: 400 },
            );
        }

        const paymentIds = [...new Set(parsedBody.data.paymentIds)];
        const reason = parsedBody.data.reason;
        await db.transaction(async (tx) => {
            for (const paymentId of paymentIds) {
                const updateResult = await tx
                    .update(payments)
                    .set({ status: 'failed' })
                    .where(and(
                        eq(payments.id, paymentId),
                        eq(payments.status, 'verifying'),
                        eq(payments.method, 'promptpay'),
                    ));
                if (getAffectedRows(updateResult) !== 1) {
                    throw new BulkReconciliationConflict(paymentId);
                }

                await tx.insert(auditLogs).values({
                    userId: session.user.id,
                    action: 'update',
                    entityType: 'payment',
                    entityId: paymentId,
                    oldValue: 'status: verifying',
                    newValue: `status: failed; bulk reconciliation; reason: ${reason}`,
                });
            }
        });

        return NextResponse.json({ message: `Marked ${paymentIds.length} payments as failed` });
    } catch (error) {
        if (error instanceof BulkReconciliationConflict) {
            return NextResponse.json(
                { error: 'บางรายการถูกเปลี่ยนสถานะไปแล้ว กรุณาโหลดข้อมูลใหม่' },
                { status: 409 },
            );
        }
        logError(error, { action: 'admin.reconciliation.action_failed' });
        return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
    }
}


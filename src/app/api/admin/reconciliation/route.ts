import { NextResponse } from 'next/server';
import { and, desc, eq, gte, sql } from 'drizzle-orm';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { auditLogs, payments, users, courses, bundles } from '@/lib/db/schema';

const bulkReconciliationSchema = z.object({
    action: z.literal('mark_failed'),
    paymentIds: z.array(z.string().min(1)).min(1).max(50),
    reason: z.string().trim().min(5).max(500),
}).strict();

class BulkReconciliationConflict extends Error {}

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
        const statusFilter = searchParams.get('status') || 'verifying';
        const daysBack = parseInt(searchParams.get('days') || '30', 10);

        const allowedStatuses = ['verifying', 'failed', 'pending'] as const;
        type ReconcileStatus = typeof allowedStatuses[number];
        if (!allowedStatuses.includes(statusFilter as ReconcileStatus)) {
            return NextResponse.json({ error: 'Invalid status filter' }, { status: 400 });
        }
        const typedStatus = statusFilter as 'verifying' | 'failed' | 'pending';

        const sinceDate = new Date();
        sinceDate.setDate(sinceDate.getDate() - Math.min(90, Math.max(1, daysBack)));

        const results = await db
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
            .where(
                and(
                    eq(payments.status, typedStatus),
                    eq(payments.method, 'promptpay'),
                    gte(payments.createdAt, sinceDate)
                )
            )
            .orderBy(desc(payments.createdAt))
            .limit(200);

        // Summary counts
        const [summary] = await db
            .select({
                verifying: sql<number>`SUM(CASE WHEN ${payments.status} = 'verifying' THEN 1 ELSE 0 END)`,
                failed: sql<number>`SUM(CASE WHEN ${payments.status} = 'failed' THEN 1 ELSE 0 END)`,
                pending: sql<number>`SUM(CASE WHEN ${payments.status} = 'pending' THEN 1 ELSE 0 END)`,
            })
            .from(payments)
            .where(
                and(
                    eq(payments.method, 'promptpay'),
                    gte(payments.createdAt, sinceDate)
                )
            );

        return NextResponse.json({
            payments: results,
            summary: {
                verifying: Number(summary?.verifying || 0),
                failed: Number(summary?.failed || 0),
                pending: Number(summary?.pending || 0),
            },
            filter: { status: statusFilter, days: daysBack },
        });
    } catch (error) {
        console.error('Error fetching reconciliation data:', error);
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
                { error: 'กรุณาระบุรายการและเหตุผลอย่างน้อย 5 ตัวอักษร' },
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
        console.error('Error in reconciliation action:', error);
        return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
    }
}


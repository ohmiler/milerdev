import { NextResponse } from 'next/server';
import { and, desc, eq, gte, inArray, sql } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { payments, users, courses, bundles } from '@/lib/db/schema';

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

        const { action, paymentIds } = await request.json();

        if (!action || !Array.isArray(paymentIds) || paymentIds.length === 0) {
            return NextResponse.json({ error: 'Missing action or paymentIds' }, { status: 400 });
        }

        if (paymentIds.length > 50) {
            return NextResponse.json({ error: 'Maximum 50 payments per batch' }, { status: 400 });
        }

        if (action === 'mark_failed') {
            await db.update(payments)
                .set({ status: 'failed' })
                .where(
                    and(
                        inArray(payments.id, paymentIds),
                        eq(payments.status, 'verifying')
                    )
                );
            return NextResponse.json({ message: `Marked ${paymentIds.length} payments as failed` });
        }

        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    } catch (error) {
        console.error('Error in reconciliation action:', error);
        return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
    }
}

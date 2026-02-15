import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { payments, users, courses, bundles } from '@/lib/db/schema';
import { desc, eq, sql, and, like, or } from 'drizzle-orm';

// GET /api/admin/payments - Get all payments with filters
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const method = searchParams.get('method');
    const search = searchParams.get('search');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20') || 20));
    const offset = (page - 1) * limit;

    // Build conditions
    const conditions = [];
    if (status && status !== 'all') {
      conditions.push(eq(payments.status, status as 'pending' | 'completed' | 'failed' | 'refunded'));
    }
    if (method && method !== 'all') {
      conditions.push(eq(payments.method, method as 'stripe' | 'promptpay' | 'bank_transfer'));
    }

    // Search filter applied after join
    const searchConditions = search
      ? or(
          like(users.name, `%${search}%`),
          like(users.email, `%${search}%`),
          like(courses.title, `%${search}%`)
        )
      : undefined;

    const allConditions = [...conditions, ...(searchConditions ? [searchConditions] : [])];

    // Parallelize all independent queries using Promise.all() (async-parallel rule)
    const whereCondition = allConditions.length > 0 ? and(...allConditions) : undefined;
    
    const [paymentList, totalCountResult, statsResult] = await Promise.all([
      // Get payments with user and course info
      db
        .select({
          id: payments.id,
          amount: payments.amount,
          currency: payments.currency,
          method: payments.method,
          status: payments.status,
          stripePaymentId: payments.stripePaymentId,
          slipUrl: payments.slipUrl,
          createdAt: payments.createdAt,
          userId: payments.userId,
          courseId: payments.courseId,
          bundleId: payments.bundleId,
          itemTitle: payments.itemTitle,
          userName: users.name,
          userEmail: users.email,
          courseTitle: courses.title,
          bundleTitle: bundles.title,
        })
        .from(payments)
        .leftJoin(users, eq(payments.userId, users.id))
        .leftJoin(courses, eq(payments.courseId, courses.id))
        .leftJoin(bundles, eq(payments.bundleId, bundles.id))
        .where(whereCondition)
        .orderBy(desc(payments.createdAt))
        .limit(limit)
        .offset(offset),
      // Get total count for pagination (needs joins for search)
      db
        .select({ count: sql<number>`count(*)` })
        .from(payments)
        .leftJoin(users, eq(payments.userId, users.id))
        .leftJoin(courses, eq(payments.courseId, courses.id))
        .where(whereCondition),
      // Get stats
      db
        .select({
          total: sql<number>`count(*)`,
          pending: sql<number>`sum(case when status = 'pending' then 1 else 0 end)`,
          completed: sql<number>`sum(case when status = 'completed' then 1 else 0 end)`,
          failed: sql<number>`sum(case when status = 'failed' then 1 else 0 end)`,
          refunded: sql<number>`sum(case when status = 'refunded' then 1 else 0 end)`,
          totalRevenue: sql<number>`sum(case when status = 'completed' then amount else 0 end)`,
        })
        .from(payments),
    ]);

    const totalCount = totalCountResult[0]?.count ?? 0;
    const stats = statsResult[0];

    return NextResponse.json({
      payments: paymentList,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
      stats: {
        total: stats?.total || 0,
        pending: stats?.pending || 0,
        completed: stats?.completed || 0,
        failed: stats?.failed || 0,
        refunded: stats?.refunded || 0,
        totalRevenue: stats?.totalRevenue || 0,
      },
    });
  } catch (error) {
    console.error('Error fetching payments:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด' },
      { status: 500 }
    );
  }
}

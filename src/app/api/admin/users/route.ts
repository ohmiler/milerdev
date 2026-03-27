import { NextResponse } from 'next/server';
import { logError } from '@/lib/error-handler';
import { requireAdmin } from '@/lib/auth-helpers';
import { db } from '@/lib/db';
import { enrollments, users } from '@/lib/db/schema';
import { desc, sql, eq, like, and, or, gte, lte } from 'drizzle-orm';

// GET /api/admin/users - Get all users with stats and advanced filtering
export async function GET(request: Request) {
  try {
    const authResult = await requireAdmin();
    if (authResult instanceof NextResponse) return authResult;

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20') || 20));
    const role = searchParams.get('role');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const offset = (page - 1) * limit;

    // Build conditions
    const conditions = [];
    
    if (role && role !== 'all') {
      conditions.push(eq(users.role, role as 'admin' | 'instructor' | 'student'));
    }
    
    if (search) {
      conditions.push(
        or(
          like(users.name, `%${search}%`),
          like(users.email, `%${search}%`)
        )
      );
    }

    if (dateFrom) {
      conditions.push(gte(users.createdAt, new Date(dateFrom)));
    }

    if (dateTo) {
      conditions.push(lte(users.createdAt, new Date(dateTo)));
    }

    const enrollmentCounts = db
      .select({
        userId: enrollments.userId,
        enrollmentCount: sql<number>`COUNT(*)`.as('enrollment_count'),
      })
      .from(enrollments)
      .groupBy(enrollments.userId)
      .as('enrollment_counts');

    // Build order
    const enrollmentCountExpression = sql<number>`COALESCE(${enrollmentCounts.enrollmentCount}, 0)`;
    const orderColumn = sortBy === 'name' ? users.name : 
                        sortBy === 'email' ? users.email :
                        sortBy === 'role' ? users.role :
                        sortBy === 'enrollmentCount' ? enrollmentCountExpression :
                        users.createdAt;

    // Parallelize independent queries using Promise.all() (async-parallel rule)
    const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;
    
    const [userList, totalCountResult, statsResult] = await Promise.all([
      // Get users
      db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          avatarUrl: users.avatarUrl,
          emailVerifiedAt: users.emailVerifiedAt,
          createdAt: users.createdAt,
          enrollmentCount: enrollmentCountExpression,
        })
        .from(users)
        .leftJoin(enrollmentCounts, eq(enrollmentCounts.userId, users.id))
        .where(whereCondition)
        .orderBy(sortOrder === 'asc' ? orderColumn : desc(orderColumn))
        .limit(limit)
        .offset(offset),
      // Get total count with filters
      db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(whereCondition),
      // Get role stats (always total, unfiltered)
      db
        .select({
          total: sql<number>`count(*)`,
          admins: sql<number>`sum(case when role = 'admin' then 1 else 0 end)`,
          instructors: sql<number>`sum(case when role = 'instructor' then 1 else 0 end)`,
          students: sql<number>`sum(case when role = 'student' then 1 else 0 end)`,
        })
        .from(users),
    ]);

    const totalCount = Number(totalCountResult[0]?.count ?? 0);
    const stats = statsResult[0];

    const usersWithCounts = userList.map((user) => ({
      ...user,
      enrollmentCount: Number(user.enrollmentCount || 0),
    }));

    return NextResponse.json({
      users: usersWithCounts,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
      stats: {
        total: stats?.total || 0,
        admins: stats?.admins || 0,
        instructors: stats?.instructors || 0,
        students: stats?.students || 0,
      },
    });
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), { action: 'Error fetching users:' });
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด' },
      { status: 500 }
    );
  }
}

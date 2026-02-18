import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-helpers';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { desc, sql, eq, like, and, or, gte, lte } from 'drizzle-orm';

// GET /api/admin/users - Get all users with stats and advanced filtering
export async function GET(request: Request) {
  try {
    const authResult = await requireAdmin();
    if (authResult instanceof NextResponse) return authResult;
    const { session } = authResult;

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

    // Build order
    const orderColumn = sortBy === 'name' ? users.name : 
                        sortBy === 'email' ? users.email :
                        sortBy === 'role' ? users.role :
                        sortBy === 'enrollmentCount' ? sql`(SELECT COUNT(*) FROM enrollments WHERE enrollments.user_id = ${users.id})` :
                        users.createdAt;

    // Parallelize independent queries using Promise.all() (async-parallel rule)
    const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;
    
    const [userList, totalCountResult, statsResult, enrollmentCounts] = await Promise.all([
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
        })
        .from(users)
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
      // Get enrollment counts per user (separate query to avoid BigInt issues)
      db.execute(sql`SELECT user_id, COUNT(*) as cnt FROM enrollments GROUP BY user_id`),
    ]);

    // Build enrollment count map from raw query result
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const enrollRows = (enrollmentCounts as any)[0] as { user_id: string; cnt: number | bigint }[];
    const enrollMap = new Map<string, number>();
    if (Array.isArray(enrollRows)) {
      for (const row of enrollRows) {
        enrollMap.set(row.user_id, Number(row.cnt));
      }
    }

    const totalCount = Number(totalCountResult[0]?.count ?? 0);
    const stats = statsResult[0];

    // Merge enrollment counts into user list
    const usersWithCounts = userList.map(u => ({
      ...u,
      enrollmentCount: enrollMap.get(u.id) || 0,
    }));

    // Sort by enrollmentCount if needed (since DB sort won't have this)
    if (sortBy === 'enrollmentCount') {
      usersWithCounts.sort((a, b) => 
        sortOrder === 'desc' 
          ? b.enrollmentCount - a.enrollmentCount 
          : a.enrollmentCount - b.enrollmentCount
      );
    }

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
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด' },
      { status: 500 }
    );
  }
}

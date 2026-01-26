import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { users, enrollments } from '@/lib/db/schema';
import { desc, sql } from 'drizzle-orm';

// GET /api/admin/users - Get all users with stats
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const role = searchParams.get('role');
    const search = searchParams.get('search');
    const offset = (page - 1) * limit;

    // Get users with enrollment counts
    const userList = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        avatarUrl: users.avatarUrl,
        emailVerifiedAt: users.emailVerifiedAt,
        createdAt: users.createdAt,
        enrollmentCount: sql<number>`(SELECT COUNT(*) FROM enrollments WHERE enrollments.user_id = ${users.id})`,
      })
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count
    const [{ count: totalCount }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users);

    // Get role stats
    const [stats] = await db
      .select({
        total: sql<number>`count(*)`,
        admins: sql<number>`sum(case when role = 'admin' then 1 else 0 end)`,
        instructors: sql<number>`sum(case when role = 'instructor' then 1 else 0 end)`,
        students: sql<number>`sum(case when role = 'student' then 1 else 0 end)`,
      })
      .from(users);

    return NextResponse.json({
      users: userList,
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

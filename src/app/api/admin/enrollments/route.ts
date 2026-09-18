import { NextResponse } from 'next/server';
import { logError } from '@/lib/error-handler';
import { requireAdmin } from '@/lib/auth-helpers';
import { db } from '@/lib/db';
import { enrollments, users, courses } from '@/lib/db/schema';
import { desc, eq, sql, and, like, or } from 'drizzle-orm';
import { adminEnrollmentGrantSchema, grantAdminEnrollment } from '@/lib/admin-enrollment';
import { getAuditContext } from '@/lib/auditLog';

// GET /api/admin/enrollments - Get all enrollments
export async function GET(request: Request) {
  try {
    const authResult = await requireAdmin();
    if (authResult instanceof NextResponse) return authResult;

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20') || 20));
    const courseId = searchParams.get('courseId');
    const search = searchParams.get('search');
    const offset = (page - 1) * limit;

    // Build conditions
    const conditions = [];
    if (courseId && courseId !== 'all') {
      conditions.push(eq(enrollments.courseId, courseId));
    }
    if (search) {
      conditions.push(
        or(
          like(users.name, `%${search}%`),
          like(users.email, `%${search}%`),
          like(courses.title, `%${search}%`)
        )!
      );
    }

    // Parallelize all independent queries using Promise.all() (async-parallel rule)
    const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;
    
    const [enrollmentList, totalCountResult, statsResult, coursesList] = await Promise.all([
      // Get enrollments with user and course info
      db
        .select({
          id: enrollments.id,
          userId: enrollments.userId,
          courseId: enrollments.courseId,
          enrolledAt: enrollments.enrolledAt,
          progressPercent: enrollments.progressPercent,
          completedAt: enrollments.completedAt,
          revokedAt: enrollments.revokedAt,
          userName: users.name,
          userEmail: users.email,
          courseTitle: courses.title,
          coursePrice: courses.price,
        })
        .from(enrollments)
        .leftJoin(users, eq(enrollments.userId, users.id))
        .leftJoin(courses, eq(enrollments.courseId, courses.id))
        .where(whereCondition)
        .orderBy(desc(enrollments.enrolledAt))
        .limit(limit)
        .offset(offset),
      // Get total count (needs joins for search)
      db
        .select({ count: sql<number>`count(*)` })
        .from(enrollments)
        .leftJoin(users, eq(enrollments.userId, users.id))
        .leftJoin(courses, eq(enrollments.courseId, courses.id))
        .where(whereCondition),
      // Get stats
      db
        .select({
          total: sql<number>`count(*)`,
          completed: sql<number>`sum(case when completed_at is not null then 1 else 0 end)`,
          inProgress: sql<number>`sum(case when completed_at is null and progress_percent > 0 then 1 else 0 end)`,
          notStarted: sql<number>`sum(case when progress_percent = 0 or progress_percent is null then 1 else 0 end)`,
        })
        .from(enrollments),
      // Get all courses for filter dropdown
      db
        .select({ id: courses.id, title: courses.title })
        .from(courses)
        .orderBy(courses.title),
    ]);

    const totalCount = totalCountResult[0]?.count ?? 0;
    const stats = statsResult[0];

    return NextResponse.json({
      enrollments: enrollmentList,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
      stats: {
        total: stats?.total || 0,
        completed: stats?.completed || 0,
        inProgress: stats?.inProgress || 0,
        notStarted: stats?.notStarted || 0,
      },
      courses: coursesList,
    });
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), { action: 'Error fetching enrollments:' });
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด' },
      { status: 500 }
    );
  }
}

// POST /api/admin/enrollments - Create new enrollment (manual)
export async function POST(request: Request) {
  try {
    const authResult = await requireAdmin();
    if (authResult instanceof NextResponse) return authResult;

    const body = await request.json().catch(() => null);
    const parsed = adminEnrollmentGrantSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'กรุณาระบุผู้ใช้และคอร์ส' }, { status: 400 });
    const result = await grantAdminEnrollment({
      ...parsed.data, actorId: authResult.session.user.id, context: await getAuditContext(),
    });
    if (result.kind === 'user_not_found' || result.kind === 'course_not_found') {
      return NextResponse.json({ error: 'ไม่พบผู้ใช้หรือคอร์ส' }, { status: 404 });
    }
    if (result.kind === 'existing') return NextResponse.json({ error: 'ผู้ใช้ลงทะเบียนคอร์สนี้แล้ว' }, { status: 400 });
    return NextResponse.json({ message: result.kind === 'restored' ? 'คืนสิทธิ์เรียนสำเร็จ' : 'ลงทะเบียนสำเร็จ', enrollmentId: result.enrollmentId }, { status: 201 });
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), { action: 'Error creating enrollment:' });
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด กรุณาลองใหม่' },
      { status: 500 }
    );
  }
}


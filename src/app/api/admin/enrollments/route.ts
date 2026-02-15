import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { enrollments, users, courses } from '@/lib/db/schema';
import { desc, eq, sql, and, like, or } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { logAudit } from '@/lib/auditLog';

// GET /api/admin/enrollments - Get all enrollments
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
    console.error('Error fetching enrollments:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด' },
      { status: 500 }
    );
  }
}

// POST /api/admin/enrollments - Create new enrollment (manual)
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { userId, courseId } = body;

    if (!userId || !courseId) {
      return NextResponse.json({ error: 'กรุณาระบุผู้ใช้และคอร์ส' }, { status: 400 });
    }

    // Check if already enrolled
    const [existing] = await db
      .select()
      .from(enrollments)
      .where(and(
        eq(enrollments.userId, userId),
        eq(enrollments.courseId, courseId)
      ))
      .limit(1);

    if (existing) {
      return NextResponse.json({ error: 'ผู้ใช้ลงทะเบียนคอร์สนี้แล้ว' }, { status: 400 });
    }

    // Create enrollment
    const enrollmentId = createId();
    await db.insert(enrollments).values({
      id: enrollmentId,
      userId,
      courseId,
      enrolledAt: new Date(),
      progressPercent: 0,
    });

    await logAudit({ userId: session.user.id, action: 'create', entityType: 'enrollment', entityId: enrollmentId, newValue: `user: ${userId}, course: ${courseId}` });

    return NextResponse.json(
      { message: 'เพิ่มการลงทะเบียนสำเร็จ', enrollmentId },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating enrollment:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด กรุณาลองใหม่' },
      { status: 500 }
    );
  }
}

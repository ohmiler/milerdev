import { NextResponse } from 'next/server';
import { logError } from '@/lib/error-handler';
import { requireAdmin } from '@/lib/auth/helpers';
import { db } from '@/lib/db';
import { enrollments, courses, users } from '@/lib/db/schema';
import { eq, notInArray } from 'drizzle-orm';
import { logAudit } from '@/lib/auditLog';
import { grantCourseAccessByAdmin } from '@/lib/learning/enrollment-access';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/admin/users/[id]/enrollments - Get user's enrollments with course info
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const authResult = await requireAdmin();
    if (authResult instanceof NextResponse) return authResult;

    const { id } = await params;

    // Get user info
    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
        deactivatedAt: users.deactivatedAt,
      })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: 'ไม่พบผู้ใช้' }, { status: 404 });
    }

    // Get user's enrollments with course details
    const userEnrollments = await db
      .select({
        id: enrollments.id,
        courseId: enrollments.courseId,
        enrolledAt: enrollments.enrolledAt,
        progressPercent: enrollments.progressPercent,
        completedAt: enrollments.completedAt,
        revokedAt: enrollments.revokedAt,
        courseTitle: courses.title,
        courseSlug: courses.slug,
        coursePrice: courses.price,
        courseImage: courses.thumbnailUrl,
      })
      .from(enrollments)
      .leftJoin(courses, eq(enrollments.courseId, courses.id))
      .where(eq(enrollments.userId, id))
      .orderBy(enrollments.enrolledAt);

    // Courses the learner has no enrollment for. A revoked one is restored from its own row.
    const enrolledCourseIds = userEnrollments
      .map(e => e.courseId)
      .filter((id): id is string => id !== null);

    const availableCourses = await db
      .select({
        id: courses.id,
        title: courses.title,
        slug: courses.slug,
        price: courses.price,
      })
      .from(courses)
      .where(
        enrolledCourseIds.length > 0
          ? notInArray(courses.id, enrolledCourseIds)
          : undefined
      )
      .orderBy(courses.title);

    return NextResponse.json({
      user: {
        ...user,
        lifecycleStatus: user.deactivatedAt === null ? 'active' : 'inactive',
      },
      enrollments: userEnrollments,
      availableCourses,
    });
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), { action: 'admin.users.id.enrollments.fetch_failed' });
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด' },
      { status: 500 }
    );
  }
}

// POST /api/admin/users/[id]/enrollments - Manual enroll user in a course
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const authResult = await requireAdmin();
    if (authResult instanceof NextResponse) return authResult;
    const { session } = authResult;

    const { id } = await params;
    const body = await request.json();
    const { courseId } = body;

    if (!courseId) {
      return NextResponse.json({ error: 'กรุณาเลือกคอร์ส' }, { status: 400 });
    }

    // Verify user exists
    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.id, id)).limit(1);
    if (!user) {
      return NextResponse.json({ error: 'ไม่พบผู้ใช้' }, { status: 404 });
    }

    // Verify course exists
    const [course] = await db.select({ id: courses.id, title: courses.title }).from(courses).where(eq(courses.id, courseId)).limit(1);
    if (!course) {
      return NextResponse.json({ error: 'ไม่พบคอร์ส' }, { status: 404 });
    }

    // A grant on a revoked enrollment restores it, with the learner's progress.
    const grant = await grantCourseAccessByAdmin(id, courseId);
    if (grant.status === 'already_active') {
      return NextResponse.json({ error: 'ผู้ใช้ลงทะเบียนคอร์สนี้แล้ว' }, { status: 400 });
    }

    const { enrollmentId } = grant;
    if (grant.status === 'restored') {
      await logAudit({ userId: session.user.id, action: 'update', entityType: 'enrollment', entityId: enrollmentId, newValue: `restored access: user: ${id}, course: ${courseId}` });
      return NextResponse.json({ message: 'คืนสิทธิ์เรียนสำเร็จ', enrollmentId, restored: true });
    }

    await logAudit({ userId: session.user.id, action: 'create', entityType: 'enrollment', entityId: enrollmentId, newValue: `user: ${id}, course: ${courseId}` });

    return NextResponse.json({ message: 'ลงทะเบียนสำเร็จ', enrollmentId });
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), { action: 'admin.users.id.enrollments.enroll_failed' });
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด' },
      { status: 500 }
    );
  }
}


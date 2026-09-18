import { getAuditContext } from '@/lib/auditLog';
import { NextResponse } from 'next/server';
import { logError } from '@/lib/error-handler';
import { requireAdmin } from '@/lib/auth-helpers';
import { db } from '@/lib/db';
import { enrollments, courses, users } from '@/lib/db/schema';
import { eq, notInArray } from 'drizzle-orm';
import { adminEnrollmentGrantSchema, grantAdminEnrollment } from '@/lib/admin-enrollment';

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

    // Get available courses (not enrolled)
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
    logError(error instanceof Error ? error : new Error(String(error)), { action: 'Error fetching user enrollments:' });
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

    const { id } = await params;
    const body = await request.json().catch(() => null);
    const parsed = adminEnrollmentGrantSchema.safeParse({ userId: id, courseId: body?.courseId });
    if (!parsed.success) return NextResponse.json({ error: 'กรุณาระบุผู้ใช้และคอร์ส' }, { status: 400 });
    const result = await grantAdminEnrollment({
      ...parsed.data, actorId: authResult.session.user.id, context: await getAuditContext(),
    });
    if (result.kind === 'user_not_found' || result.kind === 'course_not_found') {
      return NextResponse.json({ error: 'ไม่พบผู้ใช้หรือคอร์ส' }, { status: 404 });
    }
    if (result.kind === 'existing') return NextResponse.json({ error: 'ผู้ใช้ลงทะเบียนคอร์สนี้แล้ว' }, { status: 400 });
    return NextResponse.json({ message: result.kind === 'restored' ? 'คืนสิทธิ์เรียนสำเร็จ' : 'ลงทะเบียนสำเร็จ', enrollmentId: result.enrollmentId }, { status: 200 });
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), { action: 'Error manual enrolling:' });
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด' },
      { status: 500 }
    );
  }
}


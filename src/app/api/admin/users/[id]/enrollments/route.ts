import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { enrollments, courses, users } from '@/lib/db/schema';
import { eq, and, notInArray } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/admin/users/[id]/enrollments - Get user's enrollments with course info
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get user info
    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
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

    return NextResponse.json({ user, enrollments: userEnrollments, availableCourses });
  } catch (error) {
    console.error('Error fetching user enrollments:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด' },
      { status: 500 }
    );
  }
}

// POST /api/admin/users/[id]/enrollments - Manual enroll user in a course
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    // Check if already enrolled
    const existing = await db
      .select({ id: enrollments.id })
      .from(enrollments)
      .where(and(eq(enrollments.userId, id), eq(enrollments.courseId, courseId)))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json({ error: 'ผู้ใช้ลงทะเบียนคอร์สนี้แล้ว' }, { status: 400 });
    }

    // Create enrollment
    const enrollmentId = createId();
    await db.insert(enrollments).values({
      id: enrollmentId,
      userId: id,
      courseId,
    });

    return NextResponse.json({ message: 'ลงทะเบียนสำเร็จ', enrollmentId });
  } catch (error) {
    console.error('Error manual enrolling:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด' },
      { status: 500 }
    );
  }
}

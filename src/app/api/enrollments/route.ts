import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { enrollments, courses } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';

// GET /api/enrollments - Get user's enrollments
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user enrollments with course details in a single query (eliminates N+1 problem)
    const userEnrollments = await db
      .select({
        enrollment: enrollments,
        course: courses,
      })
      .from(enrollments)
      .innerJoin(courses, eq(enrollments.courseId, courses.id))
      .where(eq(enrollments.userId, session.user.id))
      .orderBy(desc(enrollments.enrolledAt));

    // Format result
    const result = userEnrollments.map(({ enrollment, course }) => ({
      ...enrollment,
      course,
    }));

    return NextResponse.json({ enrollments: result });
  } catch (error) {
    console.error('Error fetching enrollments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch enrollments' },
      { status: 500 }
    );
  }
}

// POST /api/enrollments - Enroll in a course
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบก่อน' }, { status: 401 });
    }

    const { courseId } = await request.json();

    if (!courseId) {
      return NextResponse.json({ error: 'กรุณาระบุคอร์ส' }, { status: 400 });
    }

    // Check if course exists
    const [course] = await db
      .select()
      .from(courses)
      .where(eq(courses.id, courseId))
      .limit(1);

    if (!course) {
      return NextResponse.json({ error: 'ไม่พบคอร์สนี้' }, { status: 404 });
    }

    // Check if already enrolled
    const [existingEnrollment] = await db
      .select()
      .from(enrollments)
      .where(
        and(
          eq(enrollments.userId, session.user.id),
          eq(enrollments.courseId, courseId)
        )
      )
      .limit(1);

    if (existingEnrollment) {
      return NextResponse.json(
        { error: 'คุณลงทะเบียนคอร์สนี้แล้ว', enrollment: existingEnrollment },
        { status: 400 }
      );
    }

    // Check if course is free or paid
    const price = parseFloat(course.price || '0');
    
    // For paid courses, we would integrate payment here
    // For now, we'll allow free enrollment or skip payment for demo
    if (price > 0) {
      // TODO: Integrate payment gateway (Stripe, PromptPay, etc.)
      // For demo purposes, we'll allow enrollment anyway
      console.log(`Note: Course ${course.title} costs ${price} THB - payment skipped for demo`);
    }

    // Create enrollment
    await db.insert(enrollments).values({
      userId: session.user.id,
      courseId: courseId,
      enrolledAt: new Date(),
      progressPercent: 0,
    });

    return NextResponse.json(
      { 
        message: 'ลงทะเบียนสำเร็จ!',
        course: {
          id: course.id,
          title: course.title,
          slug: course.slug,
        }
      },
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

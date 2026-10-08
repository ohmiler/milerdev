import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { enrollments } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { logError } from '@/lib/error-handler';
import { getCourseLearning, type CourseLearning } from '@/lib/learning/dashboard';

// GET /api/enrollments/check?courseId=xxx - Check if user is enrolled
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ enrolled: false, authenticated: false });
    }

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId');

    if (!courseId) {
      return NextResponse.json({ error: 'Missing courseId' }, { status: 400 });
    }

    const [enrollment] = await db
      .select()
      .from(enrollments)
      .where(
        and(
          eq(enrollments.userId, session.user.id),
          eq(enrollments.courseId, courseId)
        )
      )
      .limit(1);

    // Where the learner stands, for the course page. It never decides access: a failed read leaves
    // it out and the answer above still stands.
    let learning: CourseLearning | null = null;
    if (enrollment) {
      try {
        learning = await getCourseLearning(session.user.id, courseId);
      } catch (error) {
        logError(error, { action: 'enrollments.check.learning_failed' });
      }
    }

    return NextResponse.json({
      enrolled: !!enrollment,
      authenticated: true,
      enrollment: enrollment || null,
      learning,
    });
  } catch (error) {
    logError(error, { action: 'enrollments.check.fetch_failed' });
    return NextResponse.json(
      { error: 'Failed to check enrollment' },
      { status: 500 }
    );
  }
}

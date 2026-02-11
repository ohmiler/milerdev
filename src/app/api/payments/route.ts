import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { payments, courses, bundles } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

// GET /api/payments - Get current user's payment history
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userPayments = await db
      .select({
        id: payments.id,
        amount: payments.amount,
        currency: payments.currency,
        method: payments.method,
        status: payments.status,
        createdAt: payments.createdAt,
        courseId: payments.courseId,
        courseTitle: courses.title,
        courseSlug: courses.slug,
        bundleId: payments.bundleId,
        bundleTitle: bundles.title,
        bundleSlug: bundles.slug,
      })
      .from(payments)
      .leftJoin(courses, eq(payments.courseId, courses.id))
      .leftJoin(bundles, eq(payments.bundleId, bundles.id))
      .where(eq(payments.userId, session.user.id))
      .orderBy(desc(payments.createdAt));

    return NextResponse.json({ payments: userPayments });
  } catch (error) {
    console.error('Error fetching user payments:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}

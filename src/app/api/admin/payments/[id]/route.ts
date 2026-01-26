import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { payments, enrollments } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/admin/payments/[id] - Get single payment
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.id, id))
      .limit(1);

    if (!payment) {
      return NextResponse.json({ error: 'ไม่พบรายการชำระเงิน' }, { status: 404 });
    }

    return NextResponse.json({ payment });
  } catch (error) {
    console.error('Error fetching payment:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/payments/[id] - Update payment status
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    if (!status || !['pending', 'completed', 'failed', 'refunded'].includes(status)) {
      return NextResponse.json({ error: 'สถานะไม่ถูกต้อง' }, { status: 400 });
    }

    // Get existing payment
    const [existingPayment] = await db
      .select()
      .from(payments)
      .where(eq(payments.id, id))
      .limit(1);

    if (!existingPayment) {
      return NextResponse.json({ error: 'ไม่พบรายการชำระเงิน' }, { status: 404 });
    }

    const previousStatus = existingPayment.status;

    // Update payment status
    await db
      .update(payments)
      .set({ status })
      .where(eq(payments.id, id));

    // If status changed to 'completed', create enrollment
    if (status === 'completed' && previousStatus !== 'completed') {
      if (existingPayment.userId && existingPayment.courseId) {
        // Check if enrollment already exists
        const [existingEnrollment] = await db
          .select()
          .from(enrollments)
          .where(eq(enrollments.userId, existingPayment.userId))
          .limit(1);

        if (!existingEnrollment) {
          await db.insert(enrollments).values({
            id: createId(),
            userId: existingPayment.userId,
            courseId: existingPayment.courseId,
            enrolledAt: new Date(),
            progressPercent: 0,
          });
        }
      }
    }

    // If status changed to 'refunded' from 'completed', you might want to remove enrollment
    // This is optional based on business logic

    return NextResponse.json({ 
      message: 'อัพเดทสถานะสำเร็จ',
      previousStatus,
      newStatus: status,
    });
  } catch (error) {
    console.error('Error updating payment:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด กรุณาลองใหม่' },
      { status: 500 }
    );
  }
}

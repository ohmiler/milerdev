import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-helpers';
import { db } from '@/lib/db';
import { enrollments, lessonProgress } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { logAudit } from '@/lib/auditLog';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/admin/enrollments/[id] - Get single enrollment
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const authResult = await requireAdmin();
    if (authResult instanceof NextResponse) return authResult;
    const { session } = authResult;

    const { id } = await params;

    const [enrollment] = await db
      .select()
      .from(enrollments)
      .where(eq(enrollments.id, id))
      .limit(1);

    if (!enrollment) {
      return NextResponse.json({ error: 'ไม่พบการลงทะเบียน' }, { status: 404 });
    }

    return NextResponse.json({ enrollment });
  } catch (error) {
    console.error('Error fetching enrollment:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/enrollments/[id] - Update enrollment
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const authResult = await requireAdmin();
    if (authResult instanceof NextResponse) return authResult;
    const { session } = authResult;

    const { id } = await params;
    const body = await request.json();
    const { progressPercent, completedAt } = body;

    // Check if enrollment exists
    const [existingEnrollment] = await db
      .select()
      .from(enrollments)
      .where(eq(enrollments.id, id))
      .limit(1);

    if (!existingEnrollment) {
      return NextResponse.json({ error: 'ไม่พบการลงทะเบียน' }, { status: 404 });
    }

    // Update enrollment
    await db
      .update(enrollments)
      .set({
        progressPercent: progressPercent !== undefined ? progressPercent : existingEnrollment.progressPercent,
        completedAt: completedAt !== undefined ? (completedAt ? new Date(completedAt) : null) : existingEnrollment.completedAt,
      })
      .where(eq(enrollments.id, id));

    await logAudit({ userId: session.user.id, action: 'update', entityType: 'enrollment', entityId: id });

    return NextResponse.json({ message: 'อัพเดทการลงทะเบียนสำเร็จ' });
  } catch (error) {
    console.error('Error updating enrollment:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด กรุณาลองใหม่' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/enrollments/[id] - Delete enrollment
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const authResult = await requireAdmin();
    if (authResult instanceof NextResponse) return authResult;
    const { session } = authResult;

    const { id } = await params;

    // Check if enrollment exists
    const [existingEnrollment] = await db
      .select()
      .from(enrollments)
      .where(eq(enrollments.id, id))
      .limit(1);

    if (!existingEnrollment) {
      return NextResponse.json({ error: 'ไม่พบการลงทะเบียน' }, { status: 404 });
    }

    // Delete related lesson progress
    await db
      .delete(lessonProgress)
      .where(eq(lessonProgress.userId, existingEnrollment.userId));

    // Delete enrollment
    await db.delete(enrollments).where(eq(enrollments.id, id));

    await logAudit({ userId: session.user.id, action: 'delete', entityType: 'enrollment', entityId: id, oldValue: `user: ${existingEnrollment.userId}, course: ${existingEnrollment.courseId}` });

    return NextResponse.json({ message: 'ลบการลงทะเบียนสำเร็จ' });
  } catch (error) {
    console.error('Error deleting enrollment:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด กรุณาลองใหม่' },
      { status: 500 }
    );
  }
}

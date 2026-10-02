import { NextResponse } from 'next/server';
import { logError } from '@/lib/error-handler';
import { requireAdmin } from '@/lib/auth/helpers';
import { db } from '@/lib/db';
import { enrollments, lessonProgress, lessons } from '@/lib/db/schema';
import { and, eq, inArray } from 'drizzle-orm';
import { logAudit } from '@/lib/auditLog';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/admin/enrollments/[id] - Get single enrollment
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const authResult = await requireAdmin();
    if (authResult instanceof NextResponse) return authResult;

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
    logError(error instanceof Error ? error : new Error(String(error)), { action: 'Error fetching enrollment:' });
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
    logError(error instanceof Error ? error : new Error(String(error)), { action: 'Error updating enrollment:' });
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

    // Remove the enrollment and the member's progress in this course only, together or not at all.
    // Progress is keyed by user and lesson, so it has to be scoped through the course's lessons;
    // filtering by user alone would erase the member's progress in every other course.
    await db.transaction(async (tx) => {
      await tx
        .delete(lessonProgress)
        .where(and(
          eq(lessonProgress.userId, existingEnrollment.userId),
          inArray(
            lessonProgress.lessonId,
            tx.select({ id: lessons.id }).from(lessons).where(eq(lessons.courseId, existingEnrollment.courseId)),
          ),
        ));
      await tx.delete(enrollments).where(eq(enrollments.id, id));
    });

    await logAudit({ userId: session.user.id, action: 'delete', entityType: 'enrollment', entityId: id, oldValue: `user: ${existingEnrollment.userId}, course: ${existingEnrollment.courseId}` });

    return NextResponse.json({ message: 'ลบการลงทะเบียนสำเร็จ' });
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), { action: 'Error deleting enrollment:' });
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด กรุณาลองใหม่' },
      { status: 500 }
    );
  }
}


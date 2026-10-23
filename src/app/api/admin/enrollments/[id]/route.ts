import { NextResponse } from 'next/server';
import { logError } from '@/lib/error-handler';
import { requireAdmin } from '@/lib/auth/helpers';
import { db } from '@/lib/db';
import { enrollments } from '@/lib/db/schema';
import { and, eq, isNull } from 'drizzle-orm';
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
    logError(error instanceof Error ? error : new Error(String(error)), { action: 'admin.enrollments.id.fetch_failed' });
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
    logError(error instanceof Error ? error : new Error(String(error)), { action: 'admin.enrollments.id.update_failed' });
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด กรุณาลองใหม่' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/enrollments/[id] - Withdraw the learner's access to the course (การถอนสิทธิ์เรียน)
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const authResult = await requireAdmin();
    if (authResult instanceof NextResponse) return authResult;
    const { session } = authResult;

    const { id } = await params;

    const [existingEnrollment] = await db
      .select({ userId: enrollments.userId, courseId: enrollments.courseId, revokedAt: enrollments.revokedAt })
      .from(enrollments)
      .where(eq(enrollments.id, id))
      .limit(1);

    if (!existingEnrollment) {
      return NextResponse.json({ error: 'ไม่พบการลงทะเบียน' }, { status: 404 });
    }
    if (existingEnrollment.revokedAt) {
      return NextResponse.json({ message: 'สิทธิ์เรียนนี้ถูกถอนไว้แล้ว' });
    }

    // Revocation keeps the row, the learner's progress and any certificate, so an admin can restore
    // it later (CONTEXT.md). Keeping the row is also what makes it last: learner grant paths only
    // insert, and the unique (user, course) key stops them from replacing a revoked row.
    await db
      .update(enrollments)
      .set({ revokedAt: new Date() })
      .where(and(eq(enrollments.id, id), isNull(enrollments.revokedAt)));

    await logAudit({ userId: session.user.id, action: 'update', entityType: 'enrollment', entityId: id, newValue: `revoked access: user: ${existingEnrollment.userId}, course: ${existingEnrollment.courseId}` });

    return NextResponse.json({ message: 'ถอนสิทธิ์เรียนสำเร็จ' });
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), { action: 'admin.enrollments.id.delete_failed' });
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด กรุณาลองใหม่' },
      { status: 500 }
    );
  }
}


import { NextResponse } from 'next/server';
import { logError } from '@/lib/error-handler';
import { requireAdmin } from '@/lib/auth-helpers';
import { db } from '@/lib/db';
import { enrollments } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { changeAdminEnrollmentAccess, enrollmentAccessChangeSchema } from '@/lib/admin-enrollment';
import { getAuditContext, logAudit } from '@/lib/auditLog';

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

// DELETE preserves historical enrollment/progress; PATCH explicitly restores access.
async function changeAccess(request: Request, { params }: RouteParams, action: 'revoke' | 'restore') {
  try {
    const authResult = await requireAdmin();
    if (authResult instanceof NextResponse) return authResult;
    const body = enrollmentAccessChangeSchema.safeParse(await request.json().catch(() => null));
    if (!body.success) return NextResponse.json({ error: 'กรุณาระบุเหตุผล 5–500 ตัวอักษร' }, { status: 400 });
    const { id } = await params;
    const result = await changeAdminEnrollmentAccess({
      enrollmentId: id, action, reason: body.data.reason,
      actorId: authResult.session.user.id, context: await getAuditContext(),
    });
    if (result.kind === 'not_found') return NextResponse.json({ error: 'ไม่พบการลงทะเบียน' }, { status: 404 });
    return NextResponse.json({ message: action === 'revoke' ? 'ถอนสิทธิ์เรียนสำเร็จ โดยเก็บความคืบหน้าไว้' : 'คืนสิทธิ์เรียนสำเร็จ', ...result });
  } catch {
    return NextResponse.json({ error: 'เปลี่ยนสิทธิ์เรียนไม่สำเร็จ กรุณาลองใหม่' }, { status: 500 });
  }
}
export async function DELETE(request: Request, params: RouteParams) {
  return changeAccess(request, params, 'revoke');
}
export async function PATCH(request: Request, params: RouteParams) {
  return changeAccess(request, params, 'restore');
}

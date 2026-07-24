import { NextResponse } from 'next/server';

import { getAuditContext } from '@/lib/auditLog';
import { requireAdmin } from '@/lib/auth-helpers';
import { logError } from '@/lib/error-handler';
import { UserLifecycleError, userLifecycleService } from '@/lib/user-lifecycle';
import { adminBulkUserActionSchema } from '@/lib/validations/admin';

function lifecycleErrorResponse(error: unknown): NextResponse | null {
  if (!(error instanceof UserLifecycleError)) return null;
  const messages: Record<UserLifecycleError['code'], string> = {
    INVALID_TARGETS: 'ข้อมูลผู้ใช้ไม่ถูกต้อง',
    ACTOR_FORBIDDEN: 'บัญชีผู้ดูแลไม่มีสิทธิ์ดำเนินการนี้',
    SELF_ACTION: 'ไม่สามารถดำเนินการนี้กับบัญชีของตัวเองได้',
    USER_NOT_FOUND: 'ไม่พบผู้ใช้บางบัญชี',
    LAST_ACTIVE_ADMIN: 'ต้องมีผู้ดูแลที่ใช้งานได้อย่างน้อยหนึ่งบัญชี',
    STATE_CONFLICT: 'สถานะผู้ใช้มีการเปลี่ยนแปลง กรุณาลองใหม่',
  };
  return NextResponse.json(
    { error: messages[error.code], code: error.code },
    { status: error.status },
  );
}

// POST /api/admin/users/bulk - Bulk lifecycle and role operations
export async function POST(request: Request) {
  try {
    const authResult = await requireAdmin();
    if (authResult instanceof NextResponse) return authResult;
    const { session } = authResult;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      body = null;
    }
    const parsed = adminBulkUserActionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'ข้อมูลไม่ถูกต้อง', code: 'INVALID_REQUEST' },
        { status: 400 },
      );
    }

    const { action, userIds } = parsed.data;
    const deactivates = action === 'delete' || action === 'deactivate';
    const demotesSelf = action === 'updateRole'
      && parsed.data.data.role !== 'admin'
      && userIds.includes(session.user.id);
    if ((deactivates && userIds.includes(session.user.id)) || demotesSelf) {
      return NextResponse.json(
        { error: 'ไม่สามารถดำเนินการนี้กับบัญชีของตัวเองได้', code: 'SELF_ACTION' },
        { status: 400 },
      );
    }

    const auditContext = await getAuditContext();
    const mutation = action === 'updateRole'
      ? await userLifecycleService.updateRoles({
          actorId: session.user.id,
          targetIds: userIds,
          role: parsed.data.data.role,
          auditContext,
        })
      : await userLifecycleService.setLifecycle({
          actorId: session.user.id,
          targetIds: userIds,
          action: action === 'reactivate' ? 'reactivate' : 'deactivate',
          auditContext,
        });

    return NextResponse.json({
      message: 'ดำเนินการสำเร็จ',
      affectedCount: mutation.changedCount,
      ...mutation,
    });
  } catch (error) {
    const lifecycleResponse = lifecycleErrorResponse(error);
    if (lifecycleResponse) return lifecycleResponse;
    logError(error instanceof Error ? error : new Error(String(error)), { action: 'Error in bulk user operation:' });
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการดำเนินการ' }, { status: 500 });
  }
}

import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { getAuditContext } from '@/lib/auditLog';
import { requireAdmin } from '@/lib/auth-helpers';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { logError } from '@/lib/error-handler';
import { UserLifecycleError, userLifecycleService } from '@/lib/user-lifecycle';
import { adminUserLifecycleSchema, adminUserUpdateSchema } from '@/lib/validations/admin';

interface RouteParams {
  params: Promise<{ id: string }>;
}

function lifecycleErrorResponse(error: unknown): NextResponse | null {
  if (!(error instanceof UserLifecycleError)) return null;
  const messages: Record<UserLifecycleError['code'], string> = {
    INVALID_TARGETS: 'ข้อมูลผู้ใช้ไม่ถูกต้อง',
    ACTOR_FORBIDDEN: 'บัญชีผู้ดูแลไม่มีสิทธิ์ดำเนินการนี้',
    SELF_ACTION: 'ไม่สามารถดำเนินการนี้กับบัญชีของตัวเองได้',
    USER_NOT_FOUND: 'ไม่พบผู้ใช้',
    LAST_ACTIVE_ADMIN: 'ต้องมีผู้ดูแลที่ใช้งานได้อย่างน้อยหนึ่งบัญชี',
    STATE_CONFLICT: 'สถานะผู้ใช้มีการเปลี่ยนแปลง กรุณาลองใหม่',
  };
  return NextResponse.json(
    { error: messages[error.code], code: error.code },
    { status: error.status },
  );
}

async function readJson(request: Request): Promise<unknown | null> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

// GET /api/admin/users/[id] - Get single user
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const authResult = await requireAdmin();
    if (authResult instanceof NextResponse) return authResult;
    const { id } = await params;
    const [user] = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      avatarUrl: users.avatarUrl,
      emailVerifiedAt: users.emailVerifiedAt,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      deactivatedAt: users.deactivatedAt,
    }).from(users).where(eq(users.id, id)).limit(1);

    if (!user) {
      return NextResponse.json({ error: 'ไม่พบผู้ใช้' }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        ...user,
        lifecycleStatus: user.deactivatedAt === null ? 'active' : 'inactive',
      },
    });
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), { action: 'Error fetching user:' });
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}

// PUT /api/admin/users/[id] - Update user through the lifecycle authority
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const authResult = await requireAdmin();
    if (authResult instanceof NextResponse) return authResult;
    const { session } = authResult;
    const { id } = await params;
    const parsed = adminUserUpdateSchema.safeParse(await readJson(request));

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'ข้อมูลไม่ถูกต้อง', code: 'INVALID_REQUEST' },
        { status: 400 },
      );
    }
    if (id === session.user.id && parsed.data.role && parsed.data.role !== 'admin') {
      return NextResponse.json({ error: 'ไม่สามารถเปลี่ยนสิทธิ์ของตัวเองได้', code: 'SELF_ACTION' }, { status: 400 });
    }

    const mutation = await userLifecycleService.updateUser({
      actorId: session.user.id,
      targetId: id,
      name: parsed.data.name,
      role: parsed.data.role,
      auditContext: await getAuditContext(),
    });
    return NextResponse.json({ message: 'อัปเดตผู้ใช้สำเร็จ', ...mutation });
  } catch (error) {
    const lifecycleResponse = lifecycleErrorResponse(error);
    if (lifecycleResponse) return lifecycleResponse;
    logError(error instanceof Error ? error : new Error(String(error)), { action: 'Error updating user:' });
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด กรุณาลองใหม่' }, { status: 500 });
  }
}

// PATCH /api/admin/users/[id] - Explicitly deactivate or reactivate a user
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const authResult = await requireAdmin();
    if (authResult instanceof NextResponse) return authResult;
    const { session } = authResult;
    const { id } = await params;
    const parsed = adminUserLifecycleSchema.safeParse(await readJson(request));

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'ข้อมูลไม่ถูกต้อง', code: 'INVALID_REQUEST' },
        { status: 400 },
      );
    }
    if (id === session.user.id && parsed.data.action === 'deactivate') {
      return NextResponse.json({ error: 'ไม่สามารถปิดใช้งานบัญชีของตัวเองได้', code: 'SELF_ACTION' }, { status: 400 });
    }

    const mutation = await userLifecycleService.setLifecycle({
      actorId: session.user.id,
      targetIds: [id],
      action: parsed.data.action,
      auditContext: await getAuditContext(),
    });
    return NextResponse.json({
      message: parsed.data.action === 'deactivate'
        ? 'ปิดใช้งานบัญชีสำเร็จ'
        : 'เปิดใช้งานบัญชีสำเร็จ',
      ...mutation,
    });
  } catch (error) {
    const lifecycleResponse = lifecycleErrorResponse(error);
    if (lifecycleResponse) return lifecycleResponse;
    logError(error instanceof Error ? error : new Error(String(error)), { action: 'Error changing user lifecycle:' });
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด กรุณาลองใหม่' }, { status: 500 });
  }
}

// DELETE /api/admin/users/[id] - Compatibility path that deactivates a user
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const authResult = await requireAdmin();
    if (authResult instanceof NextResponse) return authResult;
    const { session } = authResult;
    const { id } = await params;

    if (id === session.user.id) {
      return NextResponse.json({ error: 'ไม่สามารถปิดใช้งานบัญชีของตัวเองได้', code: 'SELF_ACTION' }, { status: 400 });
    }

    const mutation = await userLifecycleService.setLifecycle({
      actorId: session.user.id,
      targetIds: [id],
      action: 'deactivate',
      auditContext: await getAuditContext(),
    });
    return NextResponse.json({ message: 'ปิดใช้งานบัญชีสำเร็จ', ...mutation });
  } catch (error) {
    const lifecycleResponse = lifecycleErrorResponse(error);
    if (lifecycleResponse) return lifecycleResponse;
    logError(error instanceof Error ? error : new Error(String(error)), { action: 'Error deactivating user:' });
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด กรุณาลองใหม่' }, { status: 500 });
  }
}

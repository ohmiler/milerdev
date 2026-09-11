import { NextResponse } from 'next/server';
import { logError } from '@/lib/error-handler';
import { requireAdmin } from '@/lib/auth-helpers';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { hashNewPassword } from '@/lib/password-storage';
import { newPasswordSchema } from '@/lib/password-validation';
import { PasswordSecurityError } from '@/lib/password-errors';
import { z } from 'zod';
import { logAudit } from '@/lib/auditLog';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/admin/users/[id]/reset-password - Admin resets user password
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const authResult = await requireAdmin();
    if (authResult instanceof NextResponse) return authResult;
    const { session } = authResult;

    const { id } = await params;
    const body = await request.json();
    const validation = z.object({ newPassword: newPasswordSchema }).safeParse(body);
    if (!validation.success) return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 });
    const { newPassword } = validation.data;

    // Check if user exists
    const [user] = await db
      .select({ id: users.id, deactivatedAt: users.deactivatedAt })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: 'ไม่พบผู้ใช้' }, { status: 404 });
    }

    // Hash and update password
    const hashedPassword = await hashNewPassword(newPassword);
    const updateResult = await db
      .update(users)
      .set({
        passwordHash: hashedPassword,
        resetToken: null,
        resetExpires: null,
        sessionVersion: sql`${users.sessionVersion} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id));

    if (updateResult[0]?.affectedRows !== 1) {
      return NextResponse.json(
        { error: 'สถานะผู้ใช้มีการเปลี่ยนแปลง กรุณาลองใหม่' },
        { status: 409 }
      );
    }

    await logAudit({
      userId: session.user.id,
      action: 'update',
      entityType: 'user',
      entityId: id,
      newValue: 'Admin reset password; sessions revoked',
    });

    return NextResponse.json({ message: 'เปลี่ยนรหัสผ่านสำเร็จ' });
  } catch (error) {
    if (error instanceof PasswordSecurityError) return NextResponse.json({ error: error.message }, { status: error.status });
    logError(new Error('Password reset failed'), { action: 'Error resetting password:' });
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด กรุณาลองใหม่' },
      { status: 500 }
    );
  }
}

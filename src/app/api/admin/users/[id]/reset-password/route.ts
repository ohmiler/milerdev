import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/admin/users/[id]/reset-password - Admin resets user password
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { newPassword } = body;

    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json(
        { error: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร' },
        { status: 400 }
      );
    }
    if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      return NextResponse.json(
        { error: 'รหัสผ่านต้องมีตัวพิมพ์ใหญ่ ตัวพิมพ์เล็ก และตัวเลขอย่างน้อย 1 ตัว' },
        { status: 400 }
      );
    }

    // Check if user exists
    const [user] = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: 'ไม่พบผู้ใช้' }, { status: 404 });
    }

    // Hash and update password
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await db
      .update(users)
      .set({
        passwordHash: hashedPassword,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id));

    return NextResponse.json({ message: 'เปลี่ยนรหัสผ่านสำเร็จ' });
  } catch (error) {
    console.error('Error resetting password:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด กรุณาลองใหม่' },
      { status: 500 }
    );
  }
}

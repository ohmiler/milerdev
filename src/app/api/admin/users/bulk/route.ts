import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { inArray } from 'drizzle-orm';
import { logAudit } from '@/lib/auditLog';

// POST /api/admin/users/bulk - Bulk operations on users
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, userIds, data } = body;

    if (!action || !userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: 'กรุณาระบุ action และ userIds' },
        { status: 400 }
      );
    }

    // Prevent operations on current admin user
    if (userIds.includes(session.user.id)) {
      return NextResponse.json(
        { error: 'ไม่สามารถดำเนินการกับตัวเองได้' },
        { status: 400 }
      );
    }

    let affectedCount = 0;

    switch (action) {
      case 'delete': {
        // Delete multiple users
        await db.delete(users).where(inArray(users.id, userIds));
        affectedCount = userIds.length;
        break;
      }

      case 'updateRole': {
        // Update role for multiple users
        const { role } = data || {};
        if (!role || !['admin', 'instructor', 'student'].includes(role)) {
          return NextResponse.json(
            { error: 'กรุณาระบุ role ที่ถูกต้อง' },
            { status: 400 }
          );
        }

        await db
          .update(users)
          .set({ role, updatedAt: new Date() })
          .where(inArray(users.id, userIds));
        affectedCount = userIds.length;
        break;
      }

      default:
        return NextResponse.json(
          { error: 'action ไม่ถูกต้อง' },
          { status: 400 }
        );
    }

    await logAudit({
      userId: session.user.id,
      action: action === 'delete' ? 'delete' : 'update',
      entityType: 'user',
      entityId: `bulk:${userIds.length}`,
      newValue: action === 'delete'
        ? `Bulk deleted ${userIds.length} users`
        : `Bulk updated role to ${data?.role} for ${userIds.length} users`,
    });

    return NextResponse.json({
      message: 'ดำเนินการสำเร็จ',
      affectedCount,
    });
  } catch (error) {
    console.error('Error in bulk operation:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการดำเนินการ' },
      { status: 500 }
    );
  }
}

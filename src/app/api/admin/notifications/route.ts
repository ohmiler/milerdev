import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-helpers';
import { db } from '@/lib/db';
import { notifications, users } from '@/lib/db/schema';
import { desc, eq, sql } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { notificationPubSub } from '@/lib/notification-pubsub';

// GET /api/admin/notifications - Get all notifications (admin view)
export async function GET(request: Request) {
  try {
    const authResult = await requireAdmin();
    if (authResult instanceof NextResponse) return authResult;
    const { session } = authResult;

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50') || 50));
    const offset = (page - 1) * limit;

    // Get notifications with user info
    const notificationList = await db
      .select({
        id: notifications.id,
        userId: notifications.userId,
        title: notifications.title,
        message: notifications.message,
        type: notifications.type,
        link: notifications.link,
        isRead: notifications.isRead,
        createdAt: notifications.createdAt,
        userName: users.name,
        userEmail: users.email,
      })
      .from(notifications)
      .leftJoin(users, eq(notifications.userId, users.id))
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count
    const [{ count: totalCount }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(notifications);

    return NextResponse.json({
      notifications: notificationList,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด' },
      { status: 500 }
    );
  }
}

// POST /api/admin/notifications - Send notification to users
export async function POST(request: Request) {
  try {
    const authResult = await requireAdmin();
    if (authResult instanceof NextResponse) return authResult;
    const { session } = authResult;

    const body = await request.json();
    const { title, message, type, link, targetUserIds, targetRole } = body;

    if (!title) {
      return NextResponse.json(
        { error: 'กรุณาระบุหัวข้อ' },
        { status: 400 }
      );
    }

    let targetUsers: { id: string }[] = [];

    if (targetUserIds && targetUserIds.length > 0) {
      // Send to specific users
      targetUsers = targetUserIds.map((id: string) => ({ id }));
    } else if (targetRole) {
      // Send to users by role
      targetUsers = await db
        .select({ id: users.id })
        .from(users)
        .where(targetRole !== 'all' ? eq(users.role, targetRole) : undefined);
    } else {
      // Send to all users
      targetUsers = await db.select({ id: users.id }).from(users);
    }

    if (targetUsers.length === 0) {
      return NextResponse.json(
        { error: 'ไม่พบผู้ใช้เป้าหมาย' },
        { status: 400 }
      );
    }

    // Create notifications
    const notificationValues = targetUsers.map(user => ({
      id: createId(),
      userId: user.id,
      title,
      message: message || null,
      type: type || 'info',
      link: link || null,
    }));

    await db.insert(notifications).values(notificationValues);

    // Broadcast to connected SSE clients in real-time
    for (const noti of notificationValues) {
      notificationPubSub.publish(noti.userId, {
        id: noti.id,
        title: noti.title,
        message: noti.message,
        type: noti.type,
        link: noti.link,
        createdAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      message: `ส่งการแจ้งเตือนไปยัง ${targetUsers.length} ผู้ใช้สำเร็จ`,
      sentCount: targetUsers.length,
    });
  } catch (error) {
    console.error('Error sending notifications:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการส่งการแจ้งเตือน' },
      { status: 500 }
    );
  }
}

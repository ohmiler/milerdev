import { NextResponse } from 'next/server';
import { logError } from '@/lib/error-handler';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { notifications } from '@/lib/db/schema';
import { desc, eq, sql, and, lt } from 'drizzle-orm';

// GET /api/notifications - Get current user's notifications
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20') || 20));
    const unreadOnly = searchParams.get('unreadOnly') === 'true';

    const conditions = [eq(notifications.userId, session.user.id)];
    if (unreadOnly) {
      conditions.push(eq(notifications.isRead, false));
    }

    // Get notifications
    const notificationList = await db
      .select()
      .from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);

    // Get unread count
    const [{ count: unreadCount }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(and(
        eq(notifications.userId, session.user.id),
        eq(notifications.isRead, false)
      ));

    // Auto-cleanup: delete read notifications older than 30 days (non-blocking)
    db.delete(notifications)
      .where(and(
        eq(notifications.userId, session.user.id),
        eq(notifications.isRead, true),
        lt(notifications.createdAt, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
      ))
      .catch(() => {});

    return NextResponse.json({
      notifications: notificationList,
      unreadCount,
    });
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), { action: 'Error fetching notifications:' });
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด' },
      { status: 500 }
    );
  }
}

// PUT /api/notifications - Mark notifications as read
export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { notificationIds, markAll } = body;

    if (markAll) {
      // Mark all as read
      await db
        .update(notifications)
        .set({ isRead: true })
        .where(eq(notifications.userId, session.user.id));
    } else if (notificationIds && notificationIds.length > 0) {
      // Mark specific notifications as read
      for (const id of notificationIds) {
        await db
          .update(notifications)
          .set({ isRead: true })
          .where(and(
            eq(notifications.id, id),
            eq(notifications.userId, session.user.id)
          ));
      }
    }

    return NextResponse.json({ message: 'อ่านการแจ้งเตือนแล้ว' });
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), { action: 'Error marking notifications:' });
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด' },
      { status: 500 }
    );
  }
}

// DELETE /api/notifications - Delete read notifications (user) or auto-cleanup old ones
export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode') || 'read';

    let deletedCount = 0;

    if (mode === 'read') {
      // Delete all read notifications for this user
      const result = await db
        .delete(notifications)
        .where(and(
          eq(notifications.userId, session.user.id),
          eq(notifications.isRead, true)
        ));
      deletedCount = (result as unknown as [{ affectedRows: number }])[0]?.affectedRows ?? 0;
    } else if (mode === 'old') {
      // Auto-cleanup: delete read notifications older than 30 days
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const result = await db
        .delete(notifications)
        .where(and(
          eq(notifications.userId, session.user.id),
          eq(notifications.isRead, true),
          lt(notifications.createdAt, thirtyDaysAgo)
        ));
      deletedCount = (result as unknown as [{ affectedRows: number }])[0]?.affectedRows ?? 0;
    }

    return NextResponse.json({
      message: `ลบการแจ้งเตือน ${deletedCount} รายการแล้ว`,
      deletedCount,
    });
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), { action: 'Error deleting notifications:' });
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด' },
      { status: 500 }
    );
  }
}

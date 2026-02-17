import { db } from '@/lib/db';
import { notifications, users } from '@/lib/db/schema';
import { createId } from '@paralleldrive/cuid2';
import { notificationPubSub } from '@/lib/notification-pubsub';
import { eq } from 'drizzle-orm';

interface NotifyOptions {
    userId?: string;
    userIds?: string[];
    allUsers?: boolean;
    targetRole?: 'student' | 'instructor' | 'admin' | 'all';
    title: string;
    message?: string;
    type?: 'info' | 'success' | 'warning' | 'error';
    link?: string;
}

/**
 * Create notification(s) in DB and broadcast via SSE in one call.
 * Supports: single user, multiple users, all users, or by role.
 */
export async function notify(opts: NotifyOptions) {
    const { title, message, type = 'info', link } = opts;

    let targetUserIds: string[] = [];

    if (opts.userId) {
        targetUserIds = [opts.userId];
    } else if (opts.userIds && opts.userIds.length > 0) {
        targetUserIds = opts.userIds;
    } else if (opts.allUsers || opts.targetRole) {
        const roleFilter = opts.targetRole && opts.targetRole !== 'all' ? opts.targetRole : null;
        const condition = roleFilter
            ? eq(users.role, roleFilter)
            : undefined;
        const allUsers = await db.select({ id: users.id }).from(users).where(condition);
        targetUserIds = allUsers.map(u => u.id);
    }

    if (targetUserIds.length === 0) return;

    const now = new Date();
    const BATCH_SIZE = 500;

    // Process in batches to avoid DB overload on mass notifications
    for (let i = 0; i < targetUserIds.length; i += BATCH_SIZE) {
        const batch = targetUserIds.slice(i, i + BATCH_SIZE);
        const values = batch.map(uid => ({
            id: createId(),
            userId: uid,
            title,
            message: message || null,
            type,
            link: link || null,
        }));

        // Insert batch into DB
        await db.insert(notifications).values(values);

        // Broadcast to SSE clients
        for (const noti of values) {
            notificationPubSub.publish(noti.userId, {
                id: noti.id,
                title: noti.title,
                message: noti.message,
                type: noti.type,
                link: noti.link,
                createdAt: now.toISOString(),
            });
        }
    }
}

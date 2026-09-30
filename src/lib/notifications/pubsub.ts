// In-memory pub/sub for real-time notification broadcasting via SSE
// Each user has a set of listeners (SSE response writers)

type NotificationPayload = {
    id: string;
    title: string;
    message: string | null;
    type: string;
    link: string | null;
    createdAt: Date | string;
};

type Listener = (notification: NotificationPayload) => void;
type ConnectionEntry = {
    listener: Listener;
    close: () => void;
};

class NotificationPubSub {
    private listeners = new Map<string, ConnectionEntry[]>();
    private static MAX_CONNECTIONS_PER_USER = 3;
    private static MAX_TOTAL_CONNECTIONS = 500;

    subscribe(userId: string, listener: Listener, close: () => void): () => void {
        if (!this.listeners.has(userId)) {
            this.listeners.set(userId, []);
        }

        const userListeners = this.listeners.get(userId)!;

        // Limit connections per user (evict oldest if exceeded)
        const oldest = userListeners.length >= NotificationPubSub.MAX_CONNECTIONS_PER_USER
            ? userListeners[0]
            : null;

        // Global connection limit
        if (!oldest && this.getActiveConnections() >= NotificationPubSub.MAX_TOTAL_CONNECTIONS) {
            throw new Error('Too many active connections');
        }

        if (oldest) {
            oldest.close();
        }

        const nextUserListeners = this.listeners.get(userId) ?? [];
        if (!this.listeners.has(userId)) {
            this.listeners.set(userId, nextUserListeners);
        }

        const entry: ConnectionEntry = {
            listener,
            close,
        };

        nextUserListeners.push(entry);

        // Return unsubscribe function
        return () => {
            const ul = this.listeners.get(userId);
            if (ul) {
                const index = ul.findIndex((e) => e.listener === listener);
                if (index !== -1) {
                    ul.splice(index, 1);
                }
                if (ul.length === 0) {
                    this.listeners.delete(userId);
                }
            }
        };
    }

    publish(userId: string, notification: NotificationPayload) {
        const userListeners = this.listeners.get(userId);
        if (userListeners) {
            for (const entry of [...userListeners]) {
                try {
                    entry.listener(notification);
                } catch {
                    entry.close();
                }
            }
        }
    }

    // Broadcast to multiple users at once
    publishToMany(userIds: string[], notification: NotificationPayload) {
        for (const userId of userIds) {
            this.publish(userId, notification);
        }
    }

    getActiveConnections(): number {
        let count = 0;
        for (const listeners of this.listeners.values()) {
            count += listeners.length;
        }
        return count;
    }
}

// Singleton instance (survives hot reload in dev via globalThis)
const globalForPubSub = globalThis as unknown as { notificationPubSub: NotificationPubSub };
export const notificationPubSub = globalForPubSub.notificationPubSub || new NotificationPubSub();
if (process.env.NODE_ENV !== 'production') {
    globalForPubSub.notificationPubSub = notificationPubSub;
}

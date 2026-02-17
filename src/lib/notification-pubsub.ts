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

class NotificationPubSub {
    private listeners = new Map<string, Set<Listener>>();
    private static MAX_CONNECTIONS_PER_USER = 3;
    private static MAX_TOTAL_CONNECTIONS = 500;

    subscribe(userId: string, listener: Listener): () => void {
        if (!this.listeners.has(userId)) {
            this.listeners.set(userId, new Set());
        }

        const userListeners = this.listeners.get(userId)!;

        // Limit connections per user (evict oldest if exceeded)
        if (userListeners.size >= NotificationPubSub.MAX_CONNECTIONS_PER_USER) {
            const oldest = userListeners.values().next().value;
            if (oldest) userListeners.delete(oldest);
        }

        // Global connection limit
        if (this.getActiveConnections() >= NotificationPubSub.MAX_TOTAL_CONNECTIONS) {
            throw new Error('Too many active connections');
        }

        userListeners.add(listener);

        // Return unsubscribe function
        return () => {
            const ul = this.listeners.get(userId);
            if (ul) {
                ul.delete(listener);
                if (ul.size === 0) {
                    this.listeners.delete(userId);
                }
            }
        };
    }

    publish(userId: string, notification: NotificationPayload) {
        const userListeners = this.listeners.get(userId);
        if (userListeners) {
            for (const listener of userListeners) {
                try {
                    listener(notification);
                } catch {
                    // Ignore failed listeners (closed connections)
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
            count += listeners.size;
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

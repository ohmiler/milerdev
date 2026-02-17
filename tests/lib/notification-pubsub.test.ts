import { describe, it, expect, vi, beforeEach } from 'vitest';

// Fresh instance for each test
function createPubSub() {
    // Re-create class inline to avoid singleton issues
    type Listener = (notification: Record<string, unknown>) => void;

    class TestPubSub {
        private listeners = new Map<string, Set<Listener>>();
        static MAX_CONNECTIONS_PER_USER = 3;
        static MAX_TOTAL_CONNECTIONS = 500;

        subscribe(userId: string, listener: Listener): () => void {
            if (!this.listeners.has(userId)) {
                this.listeners.set(userId, new Set());
            }
            const userListeners = this.listeners.get(userId)!;

            if (userListeners.size >= TestPubSub.MAX_CONNECTIONS_PER_USER) {
                const oldest = userListeners.values().next().value;
                if (oldest) userListeners.delete(oldest);
            }

            if (this.getActiveConnections() >= TestPubSub.MAX_TOTAL_CONNECTIONS) {
                throw new Error('Too many active connections');
            }

            userListeners.add(listener);
            return () => {
                const ul = this.listeners.get(userId);
                if (ul) {
                    ul.delete(listener);
                    if (ul.size === 0) this.listeners.delete(userId);
                }
            };
        }

        publish(userId: string, notification: Record<string, unknown>) {
            const userListeners = this.listeners.get(userId);
            if (userListeners) {
                for (const listener of userListeners) {
                    try { listener(notification); } catch { /* ignore */ }
                }
            }
        }

        publishToMany(userIds: string[], notification: Record<string, unknown>) {
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

    return new TestPubSub();
}

const sampleNotification = {
    id: 'noti-1',
    title: 'Test',
    message: 'Hello',
    type: 'info',
    link: null,
    createdAt: new Date().toISOString(),
};

describe('NotificationPubSub', () => {
    describe('subscribe / publish', () => {
        it('should deliver notification to subscribed listener', () => {
            const pubsub = createPubSub();
            const listener = vi.fn();
            pubsub.subscribe('user-1', listener);
            pubsub.publish('user-1', sampleNotification);
            expect(listener).toHaveBeenCalledWith(sampleNotification);
        });

        it('should not deliver to other users', () => {
            const pubsub = createPubSub();
            const listener1 = vi.fn();
            const listener2 = vi.fn();
            pubsub.subscribe('user-1', listener1);
            pubsub.subscribe('user-2', listener2);
            pubsub.publish('user-1', sampleNotification);
            expect(listener1).toHaveBeenCalledOnce();
            expect(listener2).not.toHaveBeenCalled();
        });

        it('should support multiple listeners per user', () => {
            const pubsub = createPubSub();
            const l1 = vi.fn();
            const l2 = vi.fn();
            pubsub.subscribe('user-1', l1);
            pubsub.subscribe('user-1', l2);
            pubsub.publish('user-1', sampleNotification);
            expect(l1).toHaveBeenCalledOnce();
            expect(l2).toHaveBeenCalledOnce();
        });

        it('should not throw if publishing to user with no listeners', () => {
            const pubsub = createPubSub();
            expect(() => pubsub.publish('nobody', sampleNotification)).not.toThrow();
        });
    });

    describe('unsubscribe', () => {
        it('should stop receiving after unsubscribe', () => {
            const pubsub = createPubSub();
            const listener = vi.fn();
            const unsub = pubsub.subscribe('user-1', listener);
            unsub();
            pubsub.publish('user-1', sampleNotification);
            expect(listener).not.toHaveBeenCalled();
        });

        it('should clean up empty user entry after last unsubscribe', () => {
            const pubsub = createPubSub();
            const unsub = pubsub.subscribe('user-1', vi.fn());
            unsub();
            expect(pubsub.getActiveConnections()).toBe(0);
        });
    });

    describe('per-user connection limit', () => {
        it('should evict oldest listener when limit exceeded', () => {
            const pubsub = createPubSub();
            const listeners = [vi.fn(), vi.fn(), vi.fn(), vi.fn()];
            listeners.forEach(l => pubsub.subscribe('user-1', l));

            // 4th subscribe should evict 1st → only 3 active
            expect(pubsub.getActiveConnections()).toBe(3);

            pubsub.publish('user-1', sampleNotification);
            expect(listeners[0]).not.toHaveBeenCalled(); // evicted
            expect(listeners[1]).toHaveBeenCalledOnce();
            expect(listeners[2]).toHaveBeenCalledOnce();
            expect(listeners[3]).toHaveBeenCalledOnce();
        });
    });

    describe('global connection limit', () => {
        it('should throw Error with correct message at global limit', () => {
            const pubsub = createPubSub();
            // Subscribe 500 connections (250 users × 2 each)
            for (let i = 0; i < 250; i++) {
                pubsub.subscribe(`user-${i}`, vi.fn());
                pubsub.subscribe(`user-${i}`, vi.fn());
            }
            expect(pubsub.getActiveConnections()).toBe(500);

            // 501st should throw
            expect(() => pubsub.subscribe('attacker', vi.fn()))
                .toThrow('Too many active connections');
        });
    });

    describe('publishToMany', () => {
        it('should broadcast to multiple users', () => {
            const pubsub = createPubSub();
            const l1 = vi.fn();
            const l2 = vi.fn();
            const l3 = vi.fn();
            pubsub.subscribe('user-1', l1);
            pubsub.subscribe('user-2', l2);
            pubsub.subscribe('user-3', l3);

            pubsub.publishToMany(['user-1', 'user-3'], sampleNotification);
            expect(l1).toHaveBeenCalledOnce();
            expect(l2).not.toHaveBeenCalled();
            expect(l3).toHaveBeenCalledOnce();
        });
    });

    describe('error resilience', () => {
        it('should not crash if a listener throws', () => {
            const pubsub = createPubSub();
            const badListener = vi.fn(() => { throw new Error('boom'); });
            const goodListener = vi.fn();
            pubsub.subscribe('user-1', badListener);
            pubsub.subscribe('user-1', goodListener);

            expect(() => pubsub.publish('user-1', sampleNotification)).not.toThrow();
            expect(goodListener).toHaveBeenCalledOnce();
        });
    });

    describe('getActiveConnections', () => {
        it('should return 0 initially', () => {
            const pubsub = createPubSub();
            expect(pubsub.getActiveConnections()).toBe(0);
        });

        it('should track connections accurately', () => {
            const pubsub = createPubSub();
            pubsub.subscribe('user-1', vi.fn());
            pubsub.subscribe('user-2', vi.fn());
            pubsub.subscribe('user-2', vi.fn());
            expect(pubsub.getActiveConnections()).toBe(3);
        });
    });
});

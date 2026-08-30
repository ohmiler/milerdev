'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

interface Notification {
    id: string;
    title: string;
    message: string | null;
    type: string;
    link: string | null;
    isRead?: boolean;
    createdAt: string | Date;
}

interface NotificationContextType {
    unreadCount: number;
    notifications: Notification[];
    markAsRead: (ids?: string[]) => Promise<void>;
    deleteRead: () => Promise<void>;
    refreshNotifications: () => Promise<void>;
    setNotificationsPanelOpen: (open: boolean) => void;
}

const NotificationContext = createContext<NotificationContextType>({
    unreadCount: 0,
    notifications: [],
    markAsRead: async () => {},
    deleteRead: async () => {},
    refreshNotifications: async () => {},
    setNotificationsPanelOpen: () => {},
});

export function useNotifications() {
    return useContext(NotificationContext);
}

export default function NotificationProvider({ children }: { children: React.ReactNode }) {
    const sessionResult = useSession();
    const session = sessionResult?.data;
    const status = sessionResult?.status ?? 'unauthenticated';
    const isAuthenticated = status === 'authenticated' && !!session?.user;
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isNotificationsPanelOpen, setIsNotificationsPanelOpen] = useState(false);
    const eventSourceRef = useRef<EventSource | null>(null);
    const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const shownToastIdsRef = useRef<Set<string>>(new Set());
    const isPanelOpenRef = useRef(false);

    const fetchNotificationSummary = useCallback(async () => {
        try {
            const res = await fetch('/api/notifications?summaryOnly=true', {
                cache: 'no-store',
            });
            if (res.ok) {
                const data = await res.json();
                setUnreadCount(data.unreadCount || 0);
            }
        } catch {
            // Silent fail
        }
    }, []);

    // Fetch notifications from API
    const refreshNotifications = useCallback(async () => {
        try {
            const res = await fetch('/api/notifications?limit=20', {
                cache: 'no-store',
            });
            if (res.ok) {
                const data = await res.json();
                setNotifications(data.notifications || []);
                setUnreadCount(data.unreadCount || 0);
            }
        } catch {
            // Silent fail
        }
    }, []);

    // Surface live notifications through the root Sonner toaster.
    const addToast = useCallback((notification: Notification) => {
        if (shownToastIdsRef.current.has(notification.id)) return;
        if (shownToastIdsRef.current.size >= 100) {
            const oldestId = shownToastIdsRef.current.values().next().value;
            if (oldestId) shownToastIdsRef.current.delete(oldestId);
        }
        shownToastIdsRef.current.add(notification.id);

        const options = {
            id: notification.id,
            description: notification.message
                ? notification.message.length > 80
                    ? `${notification.message.slice(0, 80)}...`
                    : notification.message
                : undefined,
            duration: 6000,
            action: notification.link
                ? {
                    label: 'ดูรายละเอียด',
                    onClick: () => window.location.assign(notification.link!),
                }
                : undefined,
        };

        if (notification.type === 'success') toast.success(notification.title, options);
        else if (notification.type === 'warning') toast.warning(notification.title, options);
        else if (notification.type === 'error') toast.error(notification.title, options);
        else toast.info(notification.title, options);
    }, []);

    // Mark notifications as read
    const markAsRead = useCallback(async (ids?: string[]) => {
        try {
            await fetch('/api/notifications', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(ids ? { notificationIds: ids } : { markAll: true }),
            });
            if (ids) {
                setNotifications(prev =>
                    prev.map(n => ids.includes(n.id) ? { ...n, isRead: true } : n)
                );
                setUnreadCount(prev => Math.max(0, prev - ids.length));
            } else {
                setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
                setUnreadCount(0);
            }
        } catch {
            // Silent fail
        }
    }, []);

    // Delete all read notifications
    const deleteRead = useCallback(async () => {
        try {
            await fetch('/api/notifications?mode=read', { method: 'DELETE' });
            setNotifications(prev => prev.filter(n => !n.isRead));
        } catch {
            // Silent fail
        }
    }, []);

    useEffect(() => {
        isPanelOpenRef.current = isNotificationsPanelOpen;
    }, [isNotificationsPanelOpen]);

    // Keep unread badge up to date without holding SSE connections open.
    useEffect(() => {
        if (!isAuthenticated) return;
        let mounted = true;

        function clearSummaryPolling() {
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
            }
        }

        function canPoll() {
            if (!mounted) return false;
            if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return false;
            if (typeof navigator !== 'undefined' && !navigator.onLine) return false;
            return true;
        }

        function startSummaryPolling() {
            if (!canPoll() || pollIntervalRef.current) return;
            pollIntervalRef.current = setInterval(() => {
                if (mounted && canPoll()) {
                    void fetchNotificationSummary();
                }
            }, 180_000);
        }

        function handleVisibilityChange() {
            if (!canPoll()) {
                clearSummaryPolling();
                return;
            }
            void fetchNotificationSummary();
            startSummaryPolling();
        }

        function handleOnline() {
            if (!canPoll()) return;
            void fetchNotificationSummary();
            startSummaryPolling();
        }

        function handleOffline() {
            clearSummaryPolling();
        }

        void Promise.resolve().then(() => {
            if (mounted && canPoll()) {
                void fetchNotificationSummary();
                startSummaryPolling();
            }
        });

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            mounted = false;
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            clearSummaryPolling();
        };
    }, [isAuthenticated, fetchNotificationSummary]);

    // Enable SSE only while the notifications panel is open in a visible tab.
    useEffect(() => {
        if (!isAuthenticated || !isNotificationsPanelOpen) return;
        let mounted = true;
        function clearReconnectTimeout() {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = null;
            }
        }

        function closeEventSource() {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
                eventSourceRef.current = null;
            }
        }

        function canUseLiveUpdates() {
            if (!mounted || !isPanelOpenRef.current) return false;
            if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return false;
            if (typeof navigator !== 'undefined' && !navigator.onLine) return false;
            return true;
        }

        function connectSSE() {
            if (!canUseLiveUpdates()) return;

            clearReconnectTimeout();
            closeEventSource();

            const es = new EventSource('/api/notifications/stream');
            eventSourceRef.current = es;

            es.addEventListener('notification', (event) => {
                if (!mounted) return;
                try {
                    const notification = JSON.parse(event.data) as Notification;
                    setNotifications(prev => [notification, ...prev].slice(0, 50));
                    setUnreadCount(prev => prev + 1);
                    addToast(notification);
                } catch {
                    // Ignore parse errors
                }
            });

            es.onerror = () => {
                closeEventSource();
                if (mounted && canUseLiveUpdates()) {
                    reconnectTimeoutRef.current = setTimeout(() => {
                        if (mounted && canUseLiveUpdates()) {
                            connectSSE();
                        }
                    }, 20_000);
                }
            };
        }

        function syncLiveUpdates() {
            if (!mounted) return;

            if (!canUseLiveUpdates()) {
                clearReconnectTimeout();
                closeEventSource();
                return;
            }

            void refreshNotifications();

            if (!eventSourceRef.current) {
                connectSSE();
            }
        }

        function handleVisibilityChange() {
            syncLiveUpdates();
        }

        function handleOnline() {
            syncLiveUpdates();
        }

        function handleOffline() {
            clearReconnectTimeout();
            closeEventSource();
        }

        void Promise.resolve().then(() => {
            if (mounted && canUseLiveUpdates()) {
                void refreshNotifications();
                connectSSE();
            }
        });

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            mounted = false;
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            clearReconnectTimeout();
            closeEventSource();
        };
    }, [isAuthenticated, isNotificationsPanelOpen, refreshNotifications, addToast]);

    useEffect(() => {
        if (isAuthenticated) return;
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }
        if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
        }
        for (const toastId of shownToastIdsRef.current) {
            toast.dismiss(toastId);
        }
        shownToastIdsRef.current.clear();
    }, [isAuthenticated]);

    const visibleNotifications = isAuthenticated ? notifications : [];
    const visibleUnreadCount = isAuthenticated ? unreadCount : 0;

    return (
        <NotificationContext.Provider value={{
            unreadCount: visibleUnreadCount,
            notifications: visibleNotifications,
            markAsRead,
            deleteRead,
            refreshNotifications,
            setNotificationsPanelOpen: setIsNotificationsPanelOpen,
        }}>
            {children}
        </NotificationContext.Provider>
    );
}

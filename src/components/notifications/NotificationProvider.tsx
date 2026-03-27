'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';

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
    toasts: Notification[];
    markAsRead: (ids?: string[]) => Promise<void>;
    deleteRead: () => Promise<void>;
    dismissToast: (id: string) => void;
    refreshNotifications: () => Promise<void>;
    setNotificationsPanelOpen: (open: boolean) => void;
}

const NotificationContext = createContext<NotificationContextType>({
    unreadCount: 0,
    notifications: [],
    toasts: [],
    markAsRead: async () => {},
    deleteRead: async () => {},
    dismissToast: () => {},
    refreshNotifications: async () => {},
    setNotificationsPanelOpen: () => {},
});

export function useNotifications() {
    return useContext(NotificationContext);
}

export default function NotificationProvider({ children }: { children: React.ReactNode }) {
    const { data: session, status } = useSession();
    const isAuthenticated = status === 'authenticated' && !!session?.user;
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [toasts, setToasts] = useState<Notification[]>([]);
    const [isNotificationsPanelOpen, setIsNotificationsPanelOpen] = useState(false);
    const eventSourceRef = useRef<EventSource | null>(null);
    const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const toastTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
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

    // Add a toast notification (auto-dismiss after 6s)
    const addToast = useCallback((notification: Notification) => {
        setToasts(prev => {
            // Prevent duplicates
            if (prev.some(t => t.id === notification.id)) return prev;
            return [notification, ...prev].slice(0, 5);
        });

        // Auto-dismiss after 6 seconds
        const timer = setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== notification.id));
            toastTimersRef.current.delete(notification.id);
        }, 6000);
        toastTimersRef.current.set(notification.id, timer);
    }, []);

    const dismissToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
        const timer = toastTimersRef.current.get(id);
        if (timer) {
            clearTimeout(timer);
            toastTimersRef.current.delete(id);
        }
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
        for (const timer of toastTimersRef.current.values()) {
            clearTimeout(timer);
        }
        toastTimersRef.current.clear();
    }, [isAuthenticated]);

    const visibleNotifications = isAuthenticated ? notifications : [];
    const visibleUnreadCount = isAuthenticated ? unreadCount : 0;
    const visibleToasts = isAuthenticated ? toasts : [];

    return (
        <NotificationContext.Provider value={{
            unreadCount: visibleUnreadCount,
            notifications: visibleNotifications,
            toasts: visibleToasts,
            markAsRead,
            deleteRead,
            dismissToast,
            refreshNotifications,
            setNotificationsPanelOpen: setIsNotificationsPanelOpen,
        }}>
            {children}
            {/* Toast Container */}
            {visibleToasts.length > 0 && (
                <div style={{
                    position: 'fixed',
                    top: '80px',
                    right: '16px',
                    zIndex: 9999,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    maxWidth: '380px',
                    width: '100%',
                }}>
                    {visibleToasts.map(toast => (
                        <ToastItem key={toast.id} toast={toast} onDismiss={dismissToast} />
                    ))}
                </div>
            )}
        </NotificationContext.Provider>
    );
}

// Toast item component
function ToastItem({ toast, onDismiss }: { toast: Notification; onDismiss: (id: string) => void }) {
    const typeStyles: Record<string, { bg: string; border: string; icon: string }> = {
        info: { bg: '#eff6ff', border: '#bfdbfe', icon: 'ℹ️' },
        success: { bg: '#f0fdf4', border: '#bbf7d0', icon: '✅' },
        warning: { bg: '#fffbeb', border: '#fde68a', icon: '⚠️' },
        error: { bg: '#fef2f2', border: '#fecaca', icon: '❌' },
    };
    const style = typeStyles[toast.type] || typeStyles.info;

    return (
        <div
            style={{
                background: 'white',
                borderRadius: '12px',
                border: `1px solid ${style.border}`,
                boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                padding: '14px 16px',
                display: 'flex',
                gap: '10px',
                alignItems: 'flex-start',
                animation: 'slideInRight 0.3s ease-out',
            }}
        >
            <span style={{ fontSize: '1.125rem', flexShrink: 0, marginTop: '1px' }}>{style.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.875rem', marginBottom: '2px' }}>
                    {toast.title}
                </div>
                {toast.message && (
                    <div style={{ color: '#64748b', fontSize: '0.8125rem', lineHeight: 1.4 }}>
                        {toast.message.length > 80 ? toast.message.slice(0, 80) + '...' : toast.message}
                    </div>
                )}
                {toast.link && (
                    <a
                        href={toast.link}
                        style={{ color: '#2563eb', fontSize: '0.8125rem', fontWeight: 500, textDecoration: 'none', marginTop: '4px', display: 'inline-block' }}
                    >
                        ดูรายละเอียด →
                    </a>
                )}
            </div>
            <button
                onClick={() => onDismiss(toast.id)}
                style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#94a3b8',
                    fontSize: '1.125rem',
                    padding: '0',
                    lineHeight: 1,
                    flexShrink: 0,
                }}
            >
                ×
            </button>
            <style>{`
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `}</style>
        </div>
    );
}

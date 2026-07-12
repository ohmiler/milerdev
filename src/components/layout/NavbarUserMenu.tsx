'use client';

import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import type { Session } from 'next-auth';
import Link from 'next/link';
import {
    AlertCircleIcon,
    ChevronDownIcon,
    CheckCircleIcon,
    InfoIcon,
    LogoutIcon,
    WarningIcon,
} from '@/components/ui/Icons';
import { Avatar, ShieldIcon, USER_MENU_LINKS } from './navigation-config';

function NotificationTypeIcon({ type }: { type: string }) {
    if (type === 'success') return <CheckCircleIcon className="w-5 h-5" />;
    if (type === 'warning') return <WarningIcon className="w-5 h-5" />;
    if (type === 'error') return <AlertCircleIcon className="w-5 h-5" />;
    return <InfoIcon className="w-5 h-5" />;
}
export interface NavbarNotification {
    id: string;
    title: string;
    message: string | null;
    type: string;
    link: string | null;
    isRead?: boolean;
    createdAt: string | Date;
}

interface NavbarUserMenuProps {
    session: Session;
    isAdmin: boolean;
    isActive: (href: string) => boolean;
    unreadCount: number;
    notifications: NavbarNotification[];
    showNotifications: boolean;
    showUserMenu: boolean;
    notificationsRef: RefObject<HTMLDivElement | null>;
    userMenuRef: RefObject<HTMLDivElement | null>;
    onToggleNotifications: () => void;
    onToggleUserMenu: () => void;
    onMarkAsRead: (ids?: string[]) => Promise<void>;
    onDeleteRead: () => Promise<void>;
    onLogout: () => void;
    onCloseMenu: () => void;
}

export default function NavbarUserMenu({
    session,
    isAdmin,
    isActive,
    unreadCount,
    notifications,
    showNotifications,
    showUserMenu,
    notificationsRef,
    userMenuRef,
    onToggleNotifications,
    onToggleUserMenu,
    onMarkAsRead,
    onDeleteRead,
    onLogout,
    onCloseMenu,
}: NavbarUserMenuProps) {
    const notificationTriggerRef = useRef<HTMLButtonElement>(null);
    const userTriggerRef = useRef<HTMLButtonElement>(null);
    const notificationPanelRef = useRef<HTMLDivElement>(null);
    const userMenuPanelRef = useRef<HTMLDivElement>(null);
    const previousOpenRef = useRef<'notifications' | 'user' | null>(null);

    useEffect(() => {
        const openPanel = showNotifications ? 'notifications' : showUserMenu ? 'user' : null;
        const previousPanel = previousOpenRef.current;

        if (openPanel) {
            previousOpenRef.current = openPanel;
            requestAnimationFrame(() => {
                const panel = openPanel === 'notifications' ? notificationPanelRef.current : userMenuPanelRef.current;
                const firstFocusable = panel?.querySelector<HTMLElement>('button:not([disabled]), a[href]');
                (firstFocusable || panel)?.focus();
            });
            return;
        }

        if (previousPanel) {
            previousOpenRef.current = null;
            requestAnimationFrame(() => {
                const trigger = previousPanel === 'notifications' ? notificationTriggerRef.current : userTriggerRef.current;
                trigger?.focus();
            });
        }
    }, [showNotifications, showUserMenu]);

    return (
        <div className="nav-user-controls">
            <div className="nav-control-anchor" ref={notificationsRef}>
                <button
                    type="button"
                    ref={notificationTriggerRef}
                    onClick={onToggleNotifications}
                    className={`nav-icon-button${showNotifications ? ' nav-icon-button--active' : ''}`}
                    aria-label="การแจ้งเตือน"
                    aria-expanded={showNotifications}
                    aria-controls="navbar-notifications-panel"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                        <path d="M13.73 21a2 2 0 01-3.46 0" />
                    </svg>
                    {unreadCount > 0 && <span className="nav-notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
                </button>

                {showNotifications && (
                    <div
                        id="navbar-notifications-panel"
                        ref={notificationPanelRef}
                        className="nav-dropdown nav-notification-panel"
                        role="region"
                        aria-label="การแจ้งเตือน"
                        tabIndex={-1}
                    >
                        <div className="nav-dropdown-header">
                            <span>การแจ้งเตือน {unreadCount > 0 && `(${unreadCount})`}</span>
                            {unreadCount > 0 && (
                                <button type="button" className="nav-dropdown-action" onClick={() => void onMarkAsRead()}>
                                    อ่านทั้งหมด
                                </button>
                            )}
                        </div>
                        <div className="nav-notification-list">
                            {notifications.length === 0 ? (
                                <div className="nav-dropdown-empty">ไม่มีการแจ้งเตือน</div>
                            ) : (
                                notifications.slice(0, 10).map((notification) => (
                                    <a
                                        key={notification.id}
                                        href={notification.link || '#'}
                                        className={`nav-notification-item${notification.isRead ? '' : ' nav-notification-item--unread'}`}
                                        onClick={async (event) => {
                                            event.preventDefault();
                                            if (!notification.isRead) await onMarkAsRead([notification.id]);
                                            onCloseMenu();
                                            if (notification.link) window.location.href = notification.link;
                                        }}
                                    >
                                        <span className="nav-notification-icon" aria-hidden="true">
                                            <NotificationTypeIcon type={notification.type} />
                                        </span>
                                        <span className="nav-notification-copy">
                                            <strong>{notification.title}</strong>
                                            {notification.message && <span>{notification.message}</span>}
                                            <small>{new Date(notification.createdAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</small>
                                        </span>
                                        {!notification.isRead && <span className="nav-notification-dot" aria-label="ยังไม่ได้อ่าน" />}
                                    </a>
                                ))
                            )}
                        </div>
                        {notifications.some((notification) => notification.isRead) && (
                            <div className="nav-dropdown-footer">
                                <button type="button" className="nav-dropdown-danger" onClick={() => void onDeleteRead()}>
                                    ลบที่อ่านแล้ว
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="nav-control-anchor" ref={userMenuRef}>
                <button
                    type="button"
                    ref={userTriggerRef}
                    onClick={onToggleUserMenu}
                    className={`nav-user-button${showUserMenu ? ' nav-user-button--active' : ''}`}
                    aria-label={`เมนูผู้ใช้ ${session.user?.name || 'ผู้ใช้'}`}
                    aria-expanded={showUserMenu}
                    aria-controls="navbar-user-menu"
                >
                    <Avatar image={session.user?.image} name={session.user?.name} />
                    <ChevronDownIcon className={`w-4 h-4 nav-user-chevron${showUserMenu ? ' nav-user-chevron--open' : ''}`} />
                </button>

                {showUserMenu && (
                    <div
                        id="navbar-user-menu"
                        ref={userMenuPanelRef}
                        className="nav-dropdown nav-user-menu"
                        role="region"
                        aria-label="เมนูผู้ใช้"
                        tabIndex={-1}
                    >
                        <div className="nav-user-summary">
                            <Avatar image={session.user?.image} name={session.user?.name} size="lg" />
                            <span>
                                <strong>{session.user?.name || 'ผู้ใช้'}</strong>
                                <small>{session.user?.email}</small>
                            </span>
                        </div>
                        <div className="nav-menu-list">
                            {USER_MENU_LINKS.map(({ href, label, icon: Icon }) => (
                                <Link
                                    key={href}
                                    href={href}
                                    onClick={onCloseMenu}
                                    className={`nav-menu-link${isActive(href) ? ' nav-menu-link--active' : ''}`}
                                >
                                    <Icon className="w-5 h-5" />
                                    {label}
                                </Link>
                            ))}
                            {isAdmin && (
                                <Link href="/admin" onClick={onCloseMenu} className="nav-menu-link nav-menu-link--admin">
                                    <ShieldIcon className="w-5 h-5" />
                                    Admin Panel
                                </Link>
                            )}
                        </div>
                        <div className="nav-menu-footer">
                            <button type="button" onClick={onLogout} className="nav-menu-link nav-menu-action nav-menu-action--danger">
                                <LogoutIcon className="w-5 h-5" />
                                ออกจากระบบ
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

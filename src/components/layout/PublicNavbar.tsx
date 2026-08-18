'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Session } from 'next-auth';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Menu, UserRoundPlus } from 'lucide-react';

import { useNotifications } from '@/components/notifications/NotificationProvider';
import { Button } from '@/components/ui/button';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import MobileNavPanel from './MobileNavPanel';
import NavbarUserMenu from './NavbarUserMenu';
import { NAV_LINKS } from './navigation-config';

interface PublicNavbarProps {
    onRequestLogout: (returnFocus: HTMLElement | null) => void;
}

export default function PublicNavbar({ onRequestLogout }: PublicNavbarProps) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [showUserDropdown, setShowUserDropdown] = useState(false);
    const [showNotiDropdown, setShowNotiDropdown] = useState(false);
    const sessionResult = useSession();
    const session = sessionResult?.data as Session | null;
    const status = sessionResult?.status ?? 'unauthenticated';
    const pathname = usePathname();
    const dropdownRef = useRef<HTMLDivElement>(null);
    const notiRef = useRef<HTMLDivElement>(null);
    const mobileMenuTriggerRef = useRef<HTMLButtonElement>(null);
    const { unreadCount, notifications, markAsRead, deleteRead, setNotificationsPanelOpen } = useNotifications();

    const isActive = useCallback(
        (href: string) => pathname === href || pathname.startsWith(href + '/'),
        [pathname],
    );
    const isAdmin = session?.user?.role === 'admin';

    const closeAllMenus = useCallback(() => {
        setIsMenuOpen(false);
        setShowUserDropdown(false);
        setShowNotiDropdown(false);
    }, []);

    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') closeAllMenus();
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [closeAllMenus]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (dropdownRef.current && !dropdownRef.current.contains(target)) setShowUserDropdown(false);
            if (notiRef.current && !notiRef.current.contains(target)) setShowNotiDropdown(false);
        };
        if (showUserDropdown || showNotiDropdown) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showUserDropdown, showNotiDropdown]);

    useEffect(() => {
        setNotificationsPanelOpen(showNotiDropdown);
    }, [showNotiDropdown, setNotificationsPanelOpen]);

    const requestLogout = (returnFocus: HTMLElement | null) => {
        closeAllMenus();
        onRequestLogout(returnFocus);
    };

    return (
        <nav
            className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 text-slate-950 shadow-[0_1px_0_rgba(15,35,58,0.02)] backdrop-blur-xl"
            aria-label="เมนูหลัก"
            data-surface="public"
        >
            <div className="container flex h-[4.5rem] items-center gap-6">
                <Link
                    href="/"
                    className="group flex shrink-0 items-center gap-2.5 rounded-xl outline-none focus-visible:ring-4 focus-visible:ring-sky-200"
                    aria-label="MilerDev หน้าแรก"
                    aria-current={pathname === '/' ? 'page' : undefined}
                >
                    <Image src="/milerdev-logo-transparent.png" alt="" width={36} height={36} className="size-9 object-contain" priority />
                    <span className="text-xl font-bold tracking-[-0.04em] transition group-hover:text-[#008bd1]">MilerDev</span>
                </Link>

                <div className="hidden flex-1 items-center justify-center gap-1 lg:flex">
                    {NAV_LINKS.map(({ href, label }) => (
                        <Link
                            key={href}
                            href={href}
                            className={`rounded-xl px-3.5 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-200 ${
                                isActive(href)
                                    ? 'bg-sky-50 text-[#008bd1]'
                                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                            }`}
                            aria-current={isActive(href) ? 'page' : undefined}
                        >
                            {label}
                        </Link>
                    ))}
                </div>

                <div className="ml-auto hidden items-center gap-2 lg:flex">
                    {status === 'loading' ? (
                        <span className="size-10 animate-pulse rounded-full bg-slate-100" aria-hidden="true" />
                    ) : session ? (
                        <NavbarUserMenu
                            session={session}
                            isAdmin={isAdmin}
                            isActive={isActive}
                            unreadCount={unreadCount}
                            notifications={notifications}
                            showNotifications={showNotiDropdown}
                            showUserMenu={showUserDropdown}
                            notificationsRef={notiRef}
                            userMenuRef={dropdownRef}
                            onToggleNotifications={() => {
                                setShowNotiDropdown((current) => !current);
                                setShowUserDropdown(false);
                            }}
                            onToggleUserMenu={() => {
                                setShowUserDropdown((current) => !current);
                                setShowNotiDropdown(false);
                            }}
                            onMarkAsRead={markAsRead}
                            onDeleteRead={deleteRead}
                            onLogout={requestLogout}
                            onCloseMenu={closeAllMenus}
                        />
                    ) : (
                        <>
                            <Button asChild variant="ghost" className="text-slate-600">
                                <Link href="/login">เข้าสู่ระบบ</Link>
                            </Button>
                            <Button asChild className="shadow-[0_8px_20px_rgba(0,171,255,0.2)]">
                                <Link href="/register">
                                    <UserRoundPlus className="size-4" aria-hidden="true" />
                                    สมัครเรียน
                                </Link>
                            </Button>
                        </>
                    )}
                </div>

                <Sheet
                    open={isMenuOpen}
                    onOpenChange={(open) => {
                        setIsMenuOpen(open);
                        if (!open) {
                            setShowUserDropdown(false);
                            setShowNotiDropdown(false);
                        }
                    }}
                >
                    <SheetTrigger asChild>
                        <Button
                            ref={mobileMenuTriggerRef}
                            type="button"
                            variant="outline"
                            size="icon"
                            className="ml-auto lg:hidden"
                            aria-label="เปิดเมนูหลัก"
                        >
                            <Menu className="size-5" aria-hidden="true" />
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="right" className="w-[min(92vw,25rem)] border-slate-200 bg-white p-0 sm:max-w-[25rem]">
                        <SheetHeader className="border-b border-slate-100 px-6 py-5">
                            <SheetTitle className="flex items-center gap-2.5 text-left">
                                <Image src="/milerdev-logo-transparent.png" alt="" width={32} height={32} className="size-8 object-contain" />
                                <span className="text-lg font-bold">MilerDev</span>
                            </SheetTitle>
                            <SheetDescription className="text-left">เลือกหน้าที่ต้องการ หรือเข้าสู่พื้นที่เรียนของคุณ</SheetDescription>
                        </SheetHeader>
                        <MobileNavPanel
                            session={session}
                            isAdmin={isAdmin}
                            isActive={isActive}
                            onClose={closeAllMenus}
                            onLogout={() => requestLogout(mobileMenuTriggerRef.current)}
                        />
                    </SheetContent>
                </Sheet>
            </div>

            <style>{`
                .nav-user-controls { display: flex; align-items: center; gap: 4px; }
                .nav-control-anchor { position: relative; }
                .nav-icon-button,
                .nav-user-button {
                    display: inline-flex;
                    min-height: 44px;
                    align-items: center;
                    justify-content: center;
                    border: 1px solid transparent;
                    border-radius: 12px;
                    background: transparent;
                    color: var(--color-text-secondary);
                    cursor: pointer;
                    transition: 150ms ease;
                }
                .nav-icon-button { position: relative; width: 44px; }
                .nav-user-button { gap: 4px; padding: 4px 6px; }
                .nav-icon-button:hover,
                .nav-icon-button--active,
                .nav-user-button:hover,
                .nav-user-button--active { border-color: var(--color-border); background: #f3f9fd; color: #008bd1; }
                .nav-user-chevron { transition: transform 150ms ease; }
                .nav-user-chevron--open { transform: rotate(180deg); }
                .nav-avatar-fallback { display: inline-flex; align-items: center; justify-content: center; border-radius: 50%; background: #00abff; color: white; font-weight: 700; }
                .nav-notification-badge { position: absolute; top: 2px; right: 0; display: grid; min-width: 18px; height: 18px; place-items: center; border: 2px solid white; border-radius: 999px; background: #ef4444; color: white; font-size: 0.65rem; font-weight: 700; }
                .nav-dropdown { position: absolute; right: 0; top: calc(100% + 12px); z-index: 100; overflow: hidden; border: 1px solid #e2e8f0; border-radius: 16px; background: white; box-shadow: 0 20px 50px rgba(15, 35, 58, 0.16); }
                .nav-notification-panel { width: min(360px, calc(100vw - 32px)); }
                .nav-user-menu { width: 280px; }
                .nav-dropdown-header, .nav-dropdown-footer { display: flex; align-items: center; justify-content: space-between; padding: 13px 16px; border-bottom: 1px solid #eef2f6; color: #0f233a; font-size: 0.9rem; font-weight: 700; }
                .nav-dropdown-footer { border-top: 1px solid #eef2f6; border-bottom: 0; }
                .nav-dropdown-action, .nav-dropdown-danger { padding: 0; border: 0; background: transparent; color: #008bd1; font-size: 0.78rem; font-weight: 600; cursor: pointer; }
                .nav-dropdown-danger { color: #dc2626; }
                .nav-dropdown-empty { padding: 32px 16px; color: #64748b; text-align: center; font-size: 0.875rem; }
                .nav-notification-list { max-height: 360px; overflow-y: auto; }
                .nav-notification-item { display: flex; gap: 10px; padding: 12px 16px; border-bottom: 1px solid #eef2f6; color: #0f233a; text-decoration: none; }
                .nav-notification-item:hover, .nav-notification-item--unread { background: #f0f9ff; }
                .nav-notification-icon { display: inline-flex; flex: 0 0 auto; color: #008bd1; }
                .nav-notification-copy { display: flex; flex: 1; min-width: 0; flex-direction: column; gap: 2px; }
                .nav-notification-copy strong, .nav-notification-copy span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
                .nav-notification-copy span { color: #475569; font-size: 0.75rem; }
                .nav-notification-copy small { color: #64748b; font-size: 0.68rem; }
                .nav-notification-dot { width: 8px; height: 8px; margin-top: 6px; border-radius: 50%; background: #00abff; flex: 0 0 auto; }
                .nav-user-summary, .nav-mobile-user-summary { display: flex; align-items: center; gap: 12px; padding: 16px; border-bottom: 1px solid #eef2f6; }
                .nav-user-summary > span, .nav-mobile-user-summary > span { display: flex; min-width: 0; flex-direction: column; }
                .nav-user-summary strong, .nav-mobile-user-summary strong, .nav-user-summary small, .nav-mobile-user-summary small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
                .nav-user-summary small, .nav-mobile-user-summary small { color: #64748b; font-size: 0.78rem; }
                .nav-menu-list { display: flex; flex-direction: column; padding: 8px; }
                .nav-menu-link { display: flex; min-height: 44px; width: 100%; align-items: center; gap: 12px; padding: 9px 12px; border: 0; border-radius: 10px; background: transparent; color: #334155; font-size: 0.9rem; text-decoration: none; cursor: pointer; }
                .nav-menu-link:hover, .nav-menu-link--active { background: #f0f9ff; color: #008bd1; }
                .nav-menu-footer { padding: 8px; border-top: 1px solid #eef2f6; }
                .nav-menu-action--danger:hover { background: #fef2f2; color: #dc2626; }
                .nav-public-mobile-panel { flex: 1; overflow-y: auto; }
                .nav-mobile-panel-inner { display: flex; flex-direction: column; padding: 12px 18px 24px; }
                .nav-mobile-panel-header { display: none; }
                .nav-mobile-link-group { display: flex; flex-direction: column; gap: 4px; padding: 8px 0; }
                .nav-mobile-link { display: flex; min-height: 48px; align-items: center; gap: 12px; padding: 10px 12px; border: 0; border-radius: 12px; color: #334155; font-size: 0.95rem; font-weight: 600; text-decoration: none; }
                .nav-mobile-link--primary { font-size: 1rem; }
                .nav-mobile-link:hover, .nav-mobile-link--active { background: #f0f9ff; color: #008bd1; }
                .nav-mobile-divider { height: 1px; background: #eef2f6; }
                .nav-mobile-action { width: 100%; background: transparent; cursor: pointer; }
                .nav-mobile-action--danger:hover { background: #fef2f2; color: #dc2626; }
                .nav-mobile-auth-actions { display: grid; gap: 10px; padding-top: 16px; }
                .nav-mobile-auth { display: flex; min-height: 48px; align-items: center; justify-content: center; gap: 8px; border-radius: 12px; font-weight: 700; text-decoration: none; }
                .nav-mobile-auth--secondary { border: 1px solid #e2e8f0; color: #334155; }
                .nav-mobile-auth--primary { background: #00abff; color: white; }
                .nav-user-controls button:focus-visible,
                .nav-dropdown a:focus-visible { outline: none; box-shadow: 0 0 0 4px rgba(0,171,255,.2); }
                @media (prefers-reduced-motion: reduce) { .nav-user-controls *, .nav-dropdown * { transition: none !important; } }
            `}</style>
        </nav>
    );
}

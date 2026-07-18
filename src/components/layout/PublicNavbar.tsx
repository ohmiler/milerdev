'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Session } from 'next-auth';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import { CloseIcon, LoginIcon, MenuIcon, RegisterIcon } from '@/components/ui/Icons';
import MobileNavPanel from './MobileNavPanel';
import NavbarUserMenu from './NavbarUserMenu';
import { NAV_LINKS } from './navigation-config';

interface PublicNavbarProps {
    onRequestLogout: () => void;
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
    const { unreadCount, notifications, markAsRead, deleteRead, setNotificationsPanelOpen } = useNotifications();

    const isActive = useCallback((href: string) => pathname === href || pathname.startsWith(href + '/'), [pathname]);
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
        const handleResize = () => {
            if (window.innerWidth >= 841) setIsMenuOpen(false);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

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

    const requestLogout = () => {
        closeAllMenus();
        onRequestLogout();
    };

    return (
        <nav className="site-nav nav-public-shell" aria-label="เมนูหลัก" data-surface="public">
            <div className="container nav-public-rail">
                <Link
                    href="/"
                    className={`nav-brand-lockup${pathname === '/' ? ' nav-brand-lockup--active' : ''}`}
                    aria-label="MilerDev หน้าแรก"
                    aria-current={pathname === '/' ? 'page' : undefined}
                >
                    <Image src="/milerdev-logo-transparent.png" alt="MilerDev" width={36} height={36} className="nav-brand-logo" />
                    <span className="nav-brand-copy">
                        <strong>MilerDev</strong>
                    </span>
                </Link>

                <div className="nav-public-links">
                    {NAV_LINKS.map(({ href, label }) => (
                        <Link
                            key={href}
                            href={href}
                            className={`nav-public-link${isActive(href) ? ' nav-public-link--active' : ''}`}
                            aria-current={isActive(href) ? 'page' : undefined}
                        >
                            {label}
                        </Link>
                    ))}
                </div>

                <div className="nav-public-actions">
                    {status === 'loading' ? (
                        <span className="nav-loading-avatar" aria-hidden="true" />
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
                            <Link href="/login" className="nav-public-auth-link">
                                <LoginIcon className="w-4 h-4" />
                                เข้าสู่ระบบ
                            </Link>
                            <Link href="/register" className="nav-public-primary">
                                <RegisterIcon className="w-4 h-4" />
                                สมัครเรียน
                                <span aria-hidden="true">→</span>
                            </Link>
                        </>
                    )}
                </div>

                <button
                    type="button"
                    className="nav-mobile-btn"
                    onClick={() => setIsMenuOpen((current) => !current)}
                    aria-label={isMenuOpen ? 'ปิดเมนูหลัก' : 'เปิดเมนูหลัก'}
                    aria-expanded={isMenuOpen}
                    aria-controls="mobile-navigation"
                >
                    {isMenuOpen ? <CloseIcon className="w-6 h-6" /> : <MenuIcon className="w-6 h-6" />}
                    <span className="nav-mobile-label">{isMenuOpen ? 'ปิด' : 'เมนู'}</span>
                </button>
            </div>

            {isMenuOpen && (
                <MobileNavPanel
                    session={session}
                    isAdmin={isAdmin}
                    isActive={isActive}
                    onClose={closeAllMenus}
                    onLogout={requestLogout}
                />
            )}

            <style>{`
                .nav-public-shell {
                    position: sticky;
                    top: 0;
                    z-index: 50;
                    background: rgba(247, 249, 251, 0.94);
                    border-bottom: 1px solid var(--color-border);
                    backdrop-filter: blur(18px) saturate(130%);
                }
                .nav-public-rail {
                    width: min(calc(100% - 48px), 1280px);
                    max-width: none;
                    min-height: 72px;
                    margin-inline: auto;
                    padding: 0;
                    display: flex;
                    align-items: center;
                    gap: 0;
                }
                .nav-brand-lockup {
                    position: relative;
                    display: inline-flex;
                    align-items: center;
                    gap: 11px;
                    width: fit-content;
                    min-height: 72px;
                    padding-right: clamp(22px, 2.5vw, 36px);
                    border-right: 1px solid var(--color-border);
                    color: var(--ink);
                    text-decoration: none;
                }
                .nav-brand-logo { width: 34px; height: 34px; }
                .nav-brand-copy { display: flex; align-items: flex-start; flex-direction: column; gap: 4px; }
                .nav-brand-copy strong { font-size: 1.14rem; font-weight: 760; line-height: 1; letter-spacing: -0.035em; transition: color 160ms ease; }
                .nav-brand-lockup:hover .nav-brand-copy strong { color: var(--accent-strong); }
                .nav-public-links {
                    align-self: stretch;
                    display: flex;
                    align-items: center;
                    justify-content: flex-start;
                    gap: 2px;
                    padding-left: clamp(12px, 1.5vw, 22px);
                    margin-right: auto;
                }
                .nav-public-link {
                    position: relative;
                    display: inline-flex;
                    align-items: center;
                    min-height: 72px;
                    padding: 2px clamp(10px, 1.1vw, 15px) 0;
                    color: var(--ink-muted);
                    font-size: 0.88rem;
                    font-weight: 650;
                    text-decoration: none;
                    transition: color 160ms ease, background-color 160ms ease;
                }
                .nav-public-link:hover {
                    color: var(--accent-strong);
                    background: var(--accent-soft);
                }
                .nav-public-link--active { color: var(--ink); background: var(--color-surface); }
                .nav-public-link::after {
                    content: '';
                    position: absolute;
                    left: 12px;
                    right: 12px;
                    bottom: -1px;
                    height: 3px;
                    background: var(--accent);
                    transform: scaleX(0);
                    transform-origin: left;
                    transition: transform 160ms ease-out;
                }
                .nav-public-link:hover::after,
                .nav-public-link--active::after { transform: scaleX(1); }
                .nav-public-actions {
                    display: flex;
                    align-items: center;
                    justify-content: flex-end;
                    gap: 8px;
                    min-width: 0;
                    min-height: 72px;
                    padding-left: clamp(14px, 1.7vw, 24px);
                    border-left: 1px solid var(--color-border);
                }
                .nav-public-auth-link,
                .nav-public-primary {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 7px;
                    min-height: 44px;
                    padding: 0 14px;
                    font-size: 0.87rem;
                    font-weight: 650;
                    text-decoration: none;
                    transition: color 160ms ease, background-color 160ms ease, border-color 160ms ease;
                }
                .nav-public-auth-link { color: var(--ink-muted); }
                .nav-public-auth-link:hover { color: var(--ink); background: var(--color-surface); }
                .nav-public-primary {
                    min-width: 128px;
                    justify-content: space-between;
                    padding-inline: 16px 13px;
                    border: 1px solid var(--accent);
                    border-radius: 0;
                    background: var(--accent);
                    clip-path: polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%);
                    color: #061923;
                }
                .nav-public-primary svg { display: none; }
                .nav-public-primary span { font-size: 1rem; transition: transform 160ms ease; }
                .nav-public-primary:hover { background: var(--color-accent-hover); border-color: var(--color-accent-hover); }
                .nav-public-primary:hover span { transform: translateX(3px); }
                .nav-user-controls { display: flex; align-items: center; gap: 4px; }
                .nav-control-anchor { position: relative; }
                .nav-icon-button,
                .nav-user-button,
                .nav-mobile-btn {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    min-height: 44px;
                    border: 1px solid transparent;
                    border-radius: 0;
                    background: transparent;
                    color: var(--ink-muted);
                    cursor: pointer;
                    transition: color 160ms ease, background-color 160ms ease, box-shadow 160ms ease;
                }
                .nav-icon-button { position: relative; width: 44px; padding: 0; }
                .nav-user-button { gap: 4px; padding: 4px 6px; }
                .nav-icon-button:hover,
                .nav-icon-button--active,
                .nav-user-button:hover,
                .nav-user-button--active,
                .nav-mobile-btn:hover { border-color: var(--color-border); color: var(--accent-strong); background: var(--accent-soft); }
                .nav-user-chevron { transition: transform 160ms ease; }
                .nav-user-chevron--open { transform: rotate(180deg); }
                .nav-avatar-fallback { display: inline-flex; align-items: center; justify-content: center; border-radius: 50%; background: var(--accent); color: var(--ink); font-size: 0.875rem; font-weight: 700; }
                .nav-notification-badge { position: absolute; top: 3px; right: 2px; display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px; border-radius: 50%; background: var(--danger); color: white; font-size: 0.65rem; font-weight: 700; }
                .nav-loading-avatar { width: 36px; height: 36px; border-radius: 50%; background: var(--surface-subtle); }
                .nav-dropdown { position: absolute; right: 0; top: calc(100% + 14px); z-index: 100; overflow: hidden; background: var(--surface-raised); border: 1px solid var(--line); border-top: 3px solid var(--accent); border-radius: 0; box-shadow: 0 18px 42px rgba(16, 32, 51, 0.13); }
                .nav-notification-panel { width: min(360px, calc(100vw - 32px)); }
                .nav-user-menu { width: 280px; }
                .nav-dropdown-header, .nav-dropdown-footer { display: flex; align-items: center; justify-content: space-between; padding: 13px 16px; border-bottom: 1px solid var(--line); color: var(--ink); font-size: 0.9rem; font-weight: 700; }
                .nav-dropdown-footer { border-top: 1px solid var(--line); border-bottom: 0; }
                .nav-dropdown-action, .nav-dropdown-danger { padding: 0; border: 0; background: transparent; color: var(--accent-strong); font-size: 0.78rem; font-weight: 600; cursor: pointer; }
                .nav-dropdown-danger { color: var(--danger); }
                .nav-dropdown-empty { padding: 32px 16px; color: var(--ink-subtle); text-align: center; font-size: 0.875rem; }
                .nav-notification-list { max-height: 360px; overflow-y: auto; }
                .nav-notification-item { display: flex; gap: 10px; padding: 12px 16px; color: var(--ink); text-decoration: none; border-bottom: 1px solid var(--line); }
                .nav-notification-item:hover, .nav-notification-item--unread { background: var(--accent-soft); }
                .nav-notification-icon { display: inline-flex; flex: 0 0 auto; color: var(--accent-strong); }
                .nav-notification-copy { display: flex; flex: 1; min-width: 0; flex-direction: column; gap: 2px; }
                .nav-notification-copy strong { overflow: hidden; color: var(--ink); font-size: 0.8rem; text-overflow: ellipsis; white-space: nowrap; }
                .nav-notification-copy span { overflow: hidden; color: var(--ink-muted); font-size: 0.75rem; text-overflow: ellipsis; white-space: nowrap; }
                .nav-notification-copy small { color: var(--ink-subtle); font-size: 0.68rem; }
                .nav-notification-dot { width: 8px; height: 8px; margin-top: 6px; border-radius: 50%; background: var(--accent); flex: 0 0 auto; }
                .nav-user-summary { display: flex; align-items: center; gap: 12px; padding: 16px 20px; border-bottom: 1px solid var(--line); }
                .nav-user-summary > span, .nav-mobile-user-summary > span { display: flex; min-width: 0; flex-direction: column; gap: 2px; }
                .nav-user-summary strong, .nav-mobile-user-summary strong { overflow: hidden; color: var(--ink); font-size: 0.9rem; text-overflow: ellipsis; white-space: nowrap; }
                .nav-user-summary small, .nav-mobile-user-summary small { overflow: hidden; color: var(--ink-subtle); font-size: 0.78rem; text-overflow: ellipsis; white-space: nowrap; }
                .nav-menu-list { display: flex; flex-direction: column; gap: 0; padding: 8px 0; }
                .nav-menu-link { display: flex; align-items: center; gap: 12px; width: 100%; min-height: 44px; padding: 9px 16px; border: 0; border-radius: 0; background: transparent; color: var(--ink-soft); font-size: 0.9rem; text-decoration: none; cursor: pointer; }
                .nav-menu-link:hover, .nav-menu-link--active { background: var(--accent-soft); color: var(--accent-strong); }
                .nav-menu-link--admin { color: var(--accent-strong); }
                .nav-menu-footer { padding: 0; border-top: 1px solid var(--line); }
                .nav-menu-action--danger:hover { background: var(--danger-soft); color: var(--danger); }
                .nav-mobile-btn { display: none; width: auto; gap: 8px; padding: 0 12px; }
                .nav-mobile-btn svg { width: 19px; height: 19px; }
                .nav-mobile-label { font-size: 0.82rem; font-weight: 700; }
                .nav-public-shell a:focus-visible,
                .nav-public-shell button:focus-visible { outline: none; box-shadow: var(--focus-ring); }
                .nav-public-shell .nav-dropdown:focus { outline: 2px solid var(--accent); outline-offset: 3px; }
                .nav-public-mobile-panel { position: absolute; top: 100%; left: 0; right: 0; max-height: calc(100dvh - 68px); overflow-y: auto; overscroll-behavior: contain; background: var(--color-surface); border-bottom: 3px solid var(--accent); box-shadow: 0 22px 50px rgba(16, 32, 51, 0.14); }
                .nav-mobile-panel-inner { display: flex; width: min(calc(100% - 36px), 1280px); margin: 0 auto; flex-direction: column; gap: 0; padding: 0 0 24px; }
                .nav-mobile-panel-header { display: flex; align-items: center; justify-content: space-between; min-height: 52px; border-bottom: 1px solid var(--line); color: var(--ink-muted); }
                .nav-mobile-panel-header span { font-size: 0.72rem; font-weight: 700; letter-spacing: 0.04em; }
                .nav-mobile-user-summary { display: flex; align-items: center; gap: 12px; padding: 14px 0; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); }
                .nav-mobile-link-group { display: flex; flex-direction: column; gap: 0; }
                .nav-mobile-link { display: flex; align-items: center; gap: 12px; min-height: 52px; padding: 10px 12px; border-bottom: 1px solid var(--line); border-radius: 0; color: var(--ink-soft); font-size: 1rem; font-weight: 600; text-decoration: none; }
                .nav-mobile-link--primary { position: relative; min-height: 62px; padding-inline: 14px 12px; font-size: 1.08rem; font-weight: 680; }
                .nav-mobile-link--primary::after { content: '→'; margin-left: auto; color: var(--ink-subtle); font-size: 0.95rem; transition: transform 160ms ease; }
                .nav-mobile-link:hover, .nav-mobile-link--active { color: var(--accent-strong); }
                .nav-mobile-link:hover { background: var(--color-surface-hover); }
                .nav-mobile-link:hover::after { transform: translateX(3px); }
                .nav-mobile-link--active { box-shadow: inset 3px 0 0 var(--accent); background: var(--accent-soft); color: var(--ink); }
                .nav-mobile-link--admin { color: var(--accent-strong); }
                .nav-mobile-divider { height: 1px; margin: 0; background: var(--line); }
                .nav-mobile-action { width: 100%; border: 0; background: transparent; cursor: pointer; }
                .nav-mobile-action--danger:hover { background: var(--danger-soft); color: var(--danger); }
                .nav-mobile-auth-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding-top: 18px; }
                .nav-mobile-auth { display: flex; align-items: center; justify-content: center; gap: 8px; min-height: 52px; border-radius: 0; font-size: 0.95rem; font-weight: 700; text-decoration: none; }
                .nav-mobile-auth--secondary { border: 1px solid var(--line); color: var(--ink-soft); }
                .nav-mobile-auth--primary { background: var(--accent); color: #061923; }
                @media (max-width: 1020px) and (min-width: 841px) {
                    .nav-public-rail { column-gap: 16px; }
                    .nav-public-links { gap: 16px; }
                    .nav-public-auth-link svg { display: none; }
                }
                @media (max-width: 840px) {
                    .nav-public-rail { display: flex; width: min(calc(100% - 36px), 1280px); min-height: 68px; justify-content: space-between; gap: 12px; }
                    .nav-brand-lockup { min-height: 68px; padding-right: 0; border-right: 0; }
                    .nav-public-links, .nav-public-actions { display: none; }
                    .nav-mobile-btn { display: inline-flex; }
                }
                @media (max-width: 620px) {
                    .nav-public-rail,
                    .nav-mobile-panel-inner { width: min(calc(100% - 28px), 1280px); }
                }
                @media (min-width: 841px) { .nav-public-mobile-panel { display: none; } }
                @media (prefers-reduced-motion: reduce) {
                    .nav-public-shell * { transition: none !important; }
                }
            `}</style>
        </nav>
    );
}

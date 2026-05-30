'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import AnnouncementBanner from '@/components/layout/AnnouncementBanner';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import {
    MenuIcon,
    CloseIcon,
    ChevronDownIcon,
    HomeIcon,
    UserIcon,
    SettingsIcon,
    LogoutIcon,
    LoginIcon,
    RegisterIcon,
    BookIcon,
    PenIcon,
    InfoIcon,
    MailIcon,
    MegaphoneIcon,
} from '@/components/ui/Icons';

// Navigation links config
const NAV_LINKS = [
    { href: '/courses', label: 'คอร์สทั้งหมด', icon: BookIcon },
    { href: '/blog', label: 'บทความ', icon: PenIcon },
    { href: '/about', label: 'เกี่ยวกับเรา', icon: InfoIcon },
    { href: '/contact', label: 'ติดต่อ', icon: MailIcon },
];

const USER_MENU_LINKS = [
    { href: '/dashboard', label: 'แดชบอร์ด', icon: HomeIcon },
    { href: '/announcements', label: 'ประกาศ', icon: MegaphoneIcon },
    { href: '/profile', label: 'โปรไฟล์', icon: UserIcon },
    { href: '/settings', label: 'ตั้งค่า', icon: SettingsIcon },
];

// Avatar component
function Avatar({ image, name, size = 'md' }: { image?: string | null; name?: string | null; size?: 'sm' | 'md' | 'lg' }) {
    const sizeMap = { sm: 32, md: 36, lg: 44 };
    const px = sizeMap[size];

    if (image) {
        return (
            <Image
                src={image}
                alt={name || 'Avatar'}
                width={px}
                height={px}
                style={{ width: px, height: px, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--primary-100)' }}
            />
        );
    }

    return (
        <div style={{
            width: px,
            height: px,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--primary-500), var(--primary-700))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 700,
            fontSize: size === 'lg' ? '1rem' : '0.875rem',
        }}>
            {name?.charAt(0).toUpperCase() || 'U'}
        </div>
    );
}

// Logo component
function Logo() {
    return (
        <Link href="/" className="nav-logo" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
            <img
                src="/milerdev-logo-transparent.png"
                alt="MilerDev"
                style={{ width: 32, height: 32 }}
            />
            <span style={{ fontWeight: 700, fontSize: '1.25rem', color: 'var(--gray-800)' }}>MilerDev</span>
        </Link>
    );
}

// Shield icon for admin
function ShieldIcon({ className = "w-5 h-5" }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
    );
}

// Main Navbar Component
export default function Navbar() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [showLogoutDialog, setShowLogoutDialog] = useState(false);
    const [showUserDropdown, setShowUserDropdown] = useState(false);
    const [showNotiDropdown, setShowNotiDropdown] = useState(false);
    const sessionResult = useSession();
    const session = sessionResult?.data;
    const status = sessionResult?.status ?? 'unauthenticated';
    const pathname = usePathname();
    const dropdownRef = useRef<HTMLDivElement>(null);
    const notiRef = useRef<HTMLDivElement>(null);
    const { unreadCount, notifications: notiList, markAsRead, deleteRead, setNotificationsPanelOpen } = useNotifications();

    const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');
    const isAdmin = session?.user?.role === 'admin';

    // Close all menus
    const closeAllMenus = useCallback(() => {
        setIsMenuOpen(false);
        setShowUserDropdown(false);
        setShowNotiDropdown(false);
    }, []);

    // Handle logout click
    const handleLogoutClick = useCallback(() => {
        closeAllMenus();
        setShowLogoutDialog(true);
    }, [closeAllMenus]);

    // Close menus on ESC key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') closeAllMenus();
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [closeAllMenus]);

    // Close mobile menu on resize
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 768) setIsMenuOpen(false);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setShowUserDropdown(false);
            }
            if (notiRef.current && !notiRef.current.contains(e.target as Node)) {
                setShowNotiDropdown(false);
            }
        };
        if (showUserDropdown || showNotiDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showUserDropdown, showNotiDropdown]);

    useEffect(() => {
        setNotificationsPanelOpen(showNotiDropdown);
    }, [showNotiDropdown, setNotificationsPanelOpen]);

    return (
        <>
            {/* Navbar */}
            <nav style={{
                position: 'sticky',
                top: 0,
                zIndex: 50,
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(10px)',
                borderBottom: '1px solid var(--gray-200)',
            }}>
                {/* Announcement Banner */}
                <AnnouncementBanner />

                <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' }}>
                    {/* Logo */}
                    <Logo />

                    {/* Desktop Navigation */}
                    <div className="nav-desktop" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {NAV_LINKS.map(({ href, label }) => (
                            <Link
                                key={href}
                                href={href}
                                className={`nav-link${isActive(href) ? ' nav-link--active' : ''}`}
                                style={{
                                    textDecoration: 'none',
                                    fontSize: '0.9375rem',
                                    padding: '0 14px',
                                    borderRadius: '8px',
                                    minHeight: '40px',
                                }}
                            >
                                {label}
                            </Link>
                        ))}
                    </div>

                    {/* Desktop Auth */}
                    <div className="nav-desktop" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {status === 'loading' ? (
                            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--gray-200)' }} />
                        ) : session ? (
                            <>
                            {/* Notification Bell */}
                            <div style={{ position: 'relative' }} ref={notiRef}>
                                <button
                                    onClick={() => { setShowNotiDropdown(!showNotiDropdown); setShowUserDropdown(false); }}
                                    className={`nav-icon-button${showNotiDropdown ? ' nav-icon-button--active' : ''}`}
                                    style={{
                                        position: 'relative',
                                        border: 'none',
                                    }}
                                    aria-label="การแจ้งเตือน"
                                    aria-haspopup="dialog"
                                    aria-expanded={showNotiDropdown}
                                    aria-controls="navbar-notifications-panel"
                                >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                                        <path d="M13.73 21a2 2 0 01-3.46 0" />
                                    </svg>
                                    {unreadCount > 0 && (
                                        <span style={{
                                            position: 'absolute',
                                            top: '4px',
                                            right: '4px',
                                            width: '18px',
                                            height: '18px',
                                            borderRadius: '50%',
                                            background: 'var(--error)',
                                            color: 'white',
                                            fontSize: '0.6875rem',
                                            fontWeight: 700,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            lineHeight: 1,
                                        }}>
                                            {unreadCount > 9 ? '9+' : unreadCount}
                                        </span>
                                    )}
                                </button>

                                {showNotiDropdown && (
                                    <div id="navbar-notifications-panel" style={{
                                        position: 'absolute',
                                        right: 0,
                                        top: '100%',
                                        marginTop: '8px',
                                        width: '360px',
                                        background: 'white',
                                        borderRadius: '12px',
                                        border: '1px solid var(--gray-200)',
                                        boxShadow: '0 8px 8px rgba(16, 32, 51, 0.08)',
                                        zIndex: 100,
                                        overflow: 'hidden',
                                    }}>
                                        <div style={{
                                            padding: '14px 16px',
                                            borderBottom: '1px solid var(--gray-100)',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                        }}>
                                            <span style={{ fontWeight: 600, color: 'var(--gray-800)', fontSize: '0.9375rem' }}>
                                                การแจ้งเตือน {unreadCount > 0 && `(${unreadCount})`}
                                            </span>
                                            {unreadCount > 0 && (
                                                <button
                                                    onClick={() => markAsRead()}
                                                    style={{
                                                        background: 'none',
                                                        border: 'none',
                                                        color: 'var(--primary-600)',
                                                        fontSize: '0.8125rem',
                                                        cursor: 'pointer',
                                                        fontWeight: 500,
                                                    }}
                                                >
                                                    อ่านทั้งหมด
                                                </button>
                                            )}
                                        </div>
                                        <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
                                            {notiList.length === 0 ? (
                                                <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--gray-400)', fontSize: '0.875rem' }}>
                                                    ไม่มีการแจ้งเตือน
                                                </div>
                                            ) : (
                                                notiList.slice(0, 10).map(n => (
                                                    <a
                                                        key={n.id}
                                                        href={n.link || '#'}
                                                        onClick={async (e) => {
                                                            e.preventDefault();
                                                            if (!n.isRead) await markAsRead([n.id]);
                                                            setShowNotiDropdown(false);
                                                            if (n.link) window.location.href = n.link;
                                                        }}
                                                        style={{
                                                            display: 'flex',
                                                            gap: '10px',
                                                            padding: '12px 16px',
                                                            textDecoration: 'none',
                                                            borderBottom: '1px solid #f8fafc',
                                                            background: n.isRead ? 'transparent' : 'var(--primary-50)',
                                                            transition: 'background-color 0.18s ease',
                                                        }}
                                                    >
                                                        <span style={{ fontSize: '1rem', flexShrink: 0, marginTop: '2px' }}>
                                                            {n.type === 'success' ? '✅' : n.type === 'warning' ? '⚠️' : n.type === 'error' ? '❌' : 'ℹ️'}
                                                        </span>
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <div style={{ fontWeight: n.isRead ? 400 : 600, color: 'var(--gray-800)', fontSize: '0.8125rem', marginBottom: '2px' }}>
                                                                {n.title}
                                                            </div>
                                                            {n.message && (
                                                                <div style={{ color: 'var(--gray-500)', fontSize: '0.75rem', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                    {n.message}
                                                                </div>
                                                            )}
                                                            <div style={{ color: 'var(--gray-400)', fontSize: '0.6875rem', marginTop: '4px' }}>
                                                                {new Date(n.createdAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                            </div>
                                                        </div>
                                                        {!n.isRead && (
                                                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary-500)', flexShrink: 0, marginTop: '6px' }} />
                                                        )}
                                                    </a>
                                                ))
                                            )}
                                        </div>
                                        {/* Delete read notifications button */}
                                        {notiList.some(n => n.isRead) && (
                                            <div style={{ padding: '8px 16px', borderTop: '1px solid var(--gray-100)' }}>
                                                <button
                                                    onClick={() => { deleteRead(); }}
                                                    style={{
                                                        width: '100%',
                                                        background: 'none',
                                                        border: 'none',
                                                        color: '#ef4444',
                                                        fontSize: '0.8125rem',
                                                        cursor: 'pointer',
                                                        fontWeight: 500,
                                                        padding: '6px 0',
                                                    }}
                                                >
                                                    ลบที่อ่านแล้ว
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div style={{ position: 'relative' }} ref={dropdownRef}>
                                <button
                                    onClick={() => setShowUserDropdown(!showUserDropdown)}
                                    className={`nav-user-button${showUserDropdown ? ' nav-user-button--active' : ''}`}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        border: 'none',
                                    }}
                                    aria-haspopup="menu"
                                    aria-expanded={showUserDropdown}
                                    aria-controls="navbar-user-menu"
                                >
                                    <Avatar image={session.user?.image} name={session.user?.name} />
                                    <span style={{
                                        fontWeight: 500,
                                        color: 'var(--gray-700)',
                                        maxWidth: '120px',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        fontSize: '0.9375rem',
                                    }}>
                                        {session.user?.name || 'ผู้ใช้'}
                                    </span>
                                    <ChevronDownIcon className={`w-4 h-4 transition-transform ${showUserDropdown ? 'rotate-180' : ''}`} />
                                </button>

                                {showUserDropdown && (
                                    <div id="navbar-user-menu" style={{
                                        position: 'absolute',
                                        right: 0,
                                        top: '100%',
                                        marginTop: '8px',
                                        width: '280px',
                                        background: 'white',
                                        borderRadius: '12px',
                                        border: '1px solid var(--gray-200)',
                                        boxShadow: '0 8px 8px rgba(16, 32, 51, 0.08)',
                                        zIndex: 100,
                                        overflow: 'hidden',
                                    }}>
                                        {/* User Info Header */}
                                        <div style={{
                                            padding: '16px 20px',
                                            borderBottom: '1px solid var(--gray-100)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px',
                                        }}>
                                            <Avatar image={session.user?.image} name={session.user?.name} size="lg" />
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{
                                                    fontWeight: 600,
                                                    color: 'var(--gray-800)',
                                                    fontSize: '0.9375rem',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                }}>
                                                    {session.user?.name || 'ผู้ใช้'}
                                                </div>
                                                <div style={{
                                                    color: 'var(--gray-400)',
                                                    fontSize: '0.8125rem',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                }}>
                                                    {session.user?.email}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Menu Links */}
                                        <div style={{ padding: '8px' }}>
                                            {USER_MENU_LINKS.map(({ href, label, icon: Icon }) => (
                                                <Link
                                                    key={href}
                                                    href={href}
                                                    onClick={() => setShowUserDropdown(false)}
                                                    className={`nav-menu-link${isActive(href) ? ' nav-menu-link--active' : ''}`}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '12px',
                                                        padding: '10px 12px',
                                                        color: isActive(href) ? 'var(--primary-700)' : 'var(--gray-700)',
                                                        textDecoration: 'none',
                                                        borderRadius: '10px',
                                                        fontSize: '0.9375rem',
                                                        fontWeight: isActive(href) ? 600 : 400,
                                                        background: isActive(href) ? 'var(--primary-50)' : 'transparent',
                                                        transition: 'background-color 0.18s ease, color 0.18s ease',
                                                    }}
                                                >
                                                    <Icon className="w-5 h-5" />
                                                    {label}
                                                </Link>
                                            ))}

                                            {/* Admin Link */}
                                            {isAdmin && (
                                                <Link
                                                    href="/admin"
                                                    onClick={() => setShowUserDropdown(false)}
                                                    className="nav-menu-link"
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '12px',
                                                        padding: '10px 12px',
                                                        color: 'var(--primary-800)',
                                                        textDecoration: 'none',
                                                        borderRadius: '10px',
                                                        fontSize: '0.9375rem',
                                                        fontWeight: 500,
                                                        transition: 'background-color 0.18s ease, color 0.18s ease',
                                                    }}
                                                >
                                                    <ShieldIcon className="w-5 h-5" />
                                                    Admin Panel
                                                </Link>
                                            )}
                                        </div>

                                        {/* Logout */}
                                        <div style={{ borderTop: '1px solid var(--gray-100)', padding: '8px' }}>
                                            <button
                                                onClick={handleLogoutClick}
                                                className="nav-menu-link nav-menu-action nav-menu-action--danger"
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '12px',
                                                    width: '100%',
                                                    padding: '10px 12px',
                                                    color: 'var(--error)',
                                                    border: 'none',
                                                    background: 'none',
                                                    borderRadius: '10px',
                                                    fontSize: '0.9375rem',
                                                    cursor: 'pointer',
                                                    transition: 'background-color 0.18s ease, color 0.18s ease',
                                                }}
                                            >
                                                <LogoutIcon className="w-5 h-5" />
                                                ออกจากระบบ
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                            </>
                        ) : (
                            <>
                                <Link href="/login" className="nav-auth-link" style={{
                                    textDecoration: 'none',
                                    fontWeight: 500,
                                    fontSize: '0.9375rem',
                                    padding: '0 16px',
                                    borderRadius: '8px',
                                    minHeight: '40px',
                                }}>
                                    เข้าสู่ระบบ
                                </Link>
                                <Link href="/register" className="btn btn-primary nav-auth-register" style={{ padding: '0 20px', fontSize: '0.9375rem', minHeight: '40px' }}>
                                    สมัครเรียน
                                </Link>
                            </>
                        )}
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        className="nav-mobile-btn"
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        aria-label={isMenuOpen ? 'ปิดเมนูหลัก' : 'เปิดเมนูหลัก'}
                        aria-expanded={isMenuOpen}
                        aria-controls="mobile-navigation"
                        style={{
                            display: 'none',
                            border: 'none',
                        }}
                    >
                        {isMenuOpen ? (
                            <CloseIcon className="w-6 h-6 text-gray-600" />
                        ) : (
                            <MenuIcon className="w-6 h-6 text-gray-600" />
                        )}
                    </button>
                </div>

                {/* Mobile Menu */}
                {isMenuOpen && (
                    <div
                        id="mobile-navigation"
                        className="nav-mobile-only"
                        style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            background: 'white',
                            zIndex: 50,
                            borderBottom: '1px solid var(--gray-200)',
                            boxShadow: '0 8px 8px rgba(16, 32, 51, 0.08)',
                            maxHeight: 'calc(100vh - 64px)',
                            overflowY: 'auto',
                        }}
                    >
                    <div style={{ padding: '16px' }}>
                        {/* User Info (logged in) */}
                        {session && (
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '12px 16px',
                                marginBottom: '12px',
                                background: '#f8fafc',
                                borderRadius: '12px',
                            }}>
                                <Avatar image={session.user?.image} name={session.user?.name} size="lg" />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{
                                        fontWeight: 600,
                                        color: 'var(--gray-800)',
                                        fontSize: '0.9375rem',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                    }}>
                                        {session.user?.name || 'ผู้ใช้'}
                                    </div>
                                    <div style={{
                                        color: 'var(--gray-400)',
                                        fontSize: '0.8125rem',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                    }}>
                                        {session.user?.email}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Navigation Links */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' }}>
                            {NAV_LINKS.map(({ href, label, icon: Icon }) => (
                                <Link
                                    key={href}
                                    href={href}
                                    onClick={() => setIsMenuOpen(false)}
                                    className={`nav-mobile-link${isActive(href) ? ' nav-mobile-link--active' : ''}`}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        padding: '12px 16px',
                                        fontSize: '0.9375rem',
                                        color: isActive(href) ? 'var(--primary-700)' : 'var(--gray-700)',
                                        fontWeight: isActive(href) ? 600 : 500,
                                        borderRadius: '10px',
                                        background: isActive(href) ? 'var(--primary-50)' : 'transparent',
                                        textDecoration: 'none',
                                        transition: 'background-color 0.18s ease, color 0.18s ease',
                                    }}
                                >
                                    <Icon className="w-5 h-5" />
                                    {label}
                                </Link>
                            ))}
                        </div>

                        <hr style={{ border: 'none', borderTop: '1px solid var(--gray-100)', margin: '12px 0' }} />

                        {session ? (
                            <>
                                {/* User Menu Links */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' }}>
                                    {USER_MENU_LINKS.map(({ href, label, icon: Icon }) => (
                                        <Link
                                            key={href}
                                            href={href}
                                            onClick={() => setIsMenuOpen(false)}
                                            className={`nav-mobile-link${isActive(href) ? ' nav-mobile-link--active' : ''}`}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '12px',
                                                padding: '12px 16px',
                                                fontSize: '0.9375rem',
                                                color: isActive(href) ? 'var(--primary-700)' : 'var(--gray-700)',
                                                fontWeight: isActive(href) ? 600 : 500,
                                                borderRadius: '10px',
                                                background: isActive(href) ? 'var(--primary-50)' : 'transparent',
                                                textDecoration: 'none',
                                                transition: 'background-color 0.18s ease, color 0.18s ease',
                                            }}
                                        >
                                            <Icon className="w-5 h-5" />
                                            {label}
                                        </Link>
                                    ))}

                                    {/* Admin Link */}
                                    {isAdmin && (
                                        <Link
                                            href="/admin"
                                            onClick={() => setIsMenuOpen(false)}
                                            className="nav-mobile-link"
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '12px',
                                                padding: '12px 16px',
                                                fontSize: '0.9375rem',
                                                color: 'var(--primary-800)',
                                                fontWeight: 500,
                                                borderRadius: '10px',
                                                textDecoration: 'none',
                                                transition: 'background-color 0.18s ease, color 0.18s ease',
                                            }}
                                        >
                                            <ShieldIcon className="w-5 h-5" />
                                            Admin Panel
                                        </Link>
                                    )}
                                </div>

                                <hr style={{ border: 'none', borderTop: '1px solid var(--gray-100)', margin: '12px 0' }} />

                                <button
                                    onClick={handleLogoutClick}
                                    className="nav-mobile-link nav-mobile-action nav-mobile-action--danger"
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        width: '100%',
                                        padding: '12px 16px',
                                        fontSize: '0.9375rem',
                                        color: 'var(--error)',
                                        fontWeight: 500,
                                        borderRadius: '10px',
                                        border: 'none',
                                        background: 'none',
                                        cursor: 'pointer',
                                        transition: 'background-color 0.18s ease, color 0.18s ease',
                                    }}
                                >
                                    <LogoutIcon className="w-5 h-5" />
                                    ออกจากระบบ
                                </button>
                            </>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '4px' }}>
                                <Link
                                    href="/login"
                                    onClick={() => setIsMenuOpen(false)}
                                    className="nav-mobile-auth nav-mobile-auth--secondary"
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        padding: '14px',
                                        color: 'var(--gray-700)',
                                        border: '1px solid var(--gray-200)',
                                        borderRadius: '8px',
                                        fontWeight: 600,
                                        fontSize: '0.9375rem',
                                        textDecoration: 'none',
                                        transition: 'background-color 0.18s ease, border-color 0.18s ease, color 0.18s ease',
                                    }}
                                >
                                    <LoginIcon className="w-5 h-5" />
                                    เข้าสู่ระบบ
                                </Link>
                                <Link
                                    href="/register"
                                    onClick={() => setIsMenuOpen(false)}
                                    className="nav-mobile-auth nav-mobile-auth--primary"
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        padding: '14px',
                                        color: 'white',
                                        background: 'var(--primary-500)',
                                        borderRadius: '8px',
                                        fontWeight: 600,
                                        fontSize: '0.9375rem',
                                        textDecoration: 'none',
                                        transition: 'background-color 0.18s ease, color 0.18s ease, transform 0.18s ease',
                                    }}
                                >
                                    <RegisterIcon className="w-5 h-5" />
                                    สมัครเรียน
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            )}
            </nav>

            {/* Responsive Styles */}
            <style>{`
                .nav-desktop { display: flex; }
                .nav-mobile-only { display: block; }
                .nav-logo {
                    min-height: 44px;
                    padding: 4px 0;
                    border-radius: 8px;
                    transition: color 0.18s ease, box-shadow 0.18s ease;
                }
                .nav-link,
                .nav-auth-link {
                    display: inline-flex;
                    align-items: center;
                    color: var(--gray-600);
                    font-weight: 600;
                    transition: background-color 0.18s ease, color 0.18s ease, box-shadow 0.18s ease;
                }
                .nav-link:hover,
                .nav-auth-link:hover,
                .nav-link--active {
                    color: var(--primary-700);
                    background: var(--primary-50);
                }
                .nav-auth-register {
                    box-shadow: none;
                }
                .nav-icon-button,
                .nav-user-button,
                .nav-mobile-btn {
                    align-items: center;
                    justify-content: center;
                    min-height: 40px;
                    border-radius: 8px;
                    background: transparent;
                    color: var(--gray-600);
                    cursor: pointer;
                    transition: background-color 0.18s ease, color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
                }
                .nav-icon-button {
                    display: inline-flex;
                    width: 40px;
                    padding: 0;
                }
                .nav-user-button {
                    padding: 4px 8px;
                }
                .nav-mobile-btn {
                    display: none !important;
                    width: 44px;
                    min-height: 44px;
                    padding: 0;
                }
                .nav-icon-button:hover,
                .nav-icon-button--active,
                .nav-user-button:hover,
                .nav-user-button--active,
                .nav-mobile-btn:hover {
                    color: var(--primary-700);
                    background: var(--primary-50);
                }
                .nav-menu-link:hover,
                .nav-mobile-link:hover {
                    color: var(--primary-700) !important;
                    background: var(--primary-50) !important;
                }
                .nav-menu-action--danger:hover,
                .nav-mobile-action--danger:hover {
                    color: var(--error) !important;
                    background: rgba(239, 68, 68, 0.08) !important;
                }
                .nav-mobile-auth--secondary:hover {
                    color: var(--primary-700) !important;
                    background: var(--primary-50) !important;
                    border-color: var(--primary-200) !important;
                }
                .nav-mobile-auth--primary:hover {
                    background: var(--primary-600) !important;
                    transform: translateY(-1px);
                }
                .nav-logo:focus-visible,
                .nav-link:focus-visible,
                .nav-auth-link:focus-visible,
                .nav-icon-button:focus-visible,
                .nav-user-button:focus-visible,
                .nav-mobile-btn:focus-visible,
                .nav-menu-link:focus-visible,
                .nav-mobile-link:focus-visible,
                .nav-mobile-auth:focus-visible {
                    outline: none;
                    box-shadow: var(--focus-ring);
                }

                @media (max-width: 768px) {
                    .nav-desktop { display: none !important; }
                    .nav-mobile-btn { display: flex !important; }
                }

                @media (min-width: 769px) {
                    .nav-mobile-only { display: none !important; }
                }

                @media (prefers-reduced-motion: reduce) {
                    .nav-logo,
                    .nav-link,
                    .nav-auth-link,
                    .nav-icon-button,
                    .nav-user-button,
                    .nav-mobile-btn,
                    .nav-menu-link,
                    .nav-mobile-link,
                    .nav-mobile-auth {
                        transition: none !important;
                    }
                    .nav-mobile-auth--primary:hover {
                        transform: none;
                    }
                }
            `}</style>

            {/* Logout Confirmation Dialog */}
            <ConfirmDialog
                isOpen={showLogoutDialog}
                title="ออกจากระบบ"
                message="คุณต้องการออกจากระบบใช่หรือไม่?"
                onConfirm={() => {
                    signOut({ callbackUrl: '/' });
                    setShowLogoutDialog(false);
                }}
                onCancel={() => setShowLogoutDialog(false)}
                confirmText="ออกจากระบบ"
                cancelText="ยกเลิก"
            />
        </>
    );
}

'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import AnnouncementBanner from '@/components/layout/AnnouncementBanner';
import NotificationBell from '@/components/layout/NotificationBell';
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
                style={{ width: px, height: px, borderRadius: '50%', objectFit: 'cover', border: '2px solid #dbeafe' }}
            />
        );
    }

    return (
        <div style={{
            width: px,
            height: px,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
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
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
            <div style={{
                width: 32,
                height: 32,
                background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}>
                <span style={{ color: 'white', fontWeight: 700, fontSize: '0.875rem' }}>M</span>
            </div>
            <span style={{ fontWeight: 700, fontSize: '1.25rem', color: '#1e293b' }}>MilerDev</span>
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
    const { data: session, status } = useSession();
    const pathname = usePathname();
    const dropdownRef = useRef<HTMLDivElement>(null);

    const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');
    const isAdmin = session?.user?.role === 'admin';

    // Close all menus
    const closeAllMenus = useCallback(() => {
        setIsMenuOpen(false);
        setShowUserDropdown(false);
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
        };
        if (showUserDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showUserDropdown]);

    return (
        <>
            {/* Navbar */}
            <nav style={{
                position: 'sticky',
                top: 0,
                zIndex: 50,
                background: 'rgba(255,255,255,0.95)',
                backdropFilter: 'blur(8px)',
                borderBottom: '1px solid #e2e8f0',
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
                                style={{
                                    color: isActive(href) ? '#2563eb' : '#64748b',
                                    textDecoration: 'none',
                                    fontWeight: isActive(href) ? 600 : 500,
                                    fontSize: '0.9375rem',
                                    padding: '6px 14px',
                                    borderRadius: '8px',
                                    background: isActive(href) ? '#eff6ff' : 'transparent',
                                    transition: 'all 0.15s',
                                }}
                            >
                                {label}
                            </Link>
                        ))}
                    </div>

                    {/* Desktop Auth */}
                    <div className="nav-desktop" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {status === 'loading' ? (
                            <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#e2e8f0' }} />
                        ) : session ? (
                            <>
                            <NotificationBell />
                            <div style={{ position: 'relative' }} ref={dropdownRef}>
                                <button
                                    onClick={() => setShowUserDropdown(!showUserDropdown)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        padding: '4px 8px',
                                        borderRadius: '8px',
                                        transition: 'background 0.15s',
                                    }}
                                >
                                    <Avatar image={session.user?.image} name={session.user?.name} />
                                    <span style={{
                                        fontWeight: 500,
                                        color: '#374151',
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
                                    <div style={{
                                        position: 'absolute',
                                        right: 0,
                                        top: '100%',
                                        marginTop: '8px',
                                        width: '280px',
                                        background: 'white',
                                        borderRadius: '16px',
                                        border: '1px solid #e2e8f0',
                                        boxShadow: '0 10px 40px rgba(0,0,0,0.12)',
                                        zIndex: 100,
                                        overflow: 'hidden',
                                    }}>
                                        {/* User Info Header */}
                                        <div style={{
                                            padding: '16px 20px',
                                            borderBottom: '1px solid #f1f5f9',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px',
                                        }}>
                                            <Avatar image={session.user?.image} name={session.user?.name} size="lg" />
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{
                                                    fontWeight: 600,
                                                    color: '#1e293b',
                                                    fontSize: '0.9375rem',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                }}>
                                                    {session.user?.name || 'ผู้ใช้'}
                                                </div>
                                                <div style={{
                                                    color: '#94a3b8',
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
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '12px',
                                                        padding: '10px 12px',
                                                        color: isActive(href) ? '#2563eb' : '#374151',
                                                        textDecoration: 'none',
                                                        borderRadius: '10px',
                                                        fontSize: '0.9375rem',
                                                        fontWeight: isActive(href) ? 600 : 400,
                                                        background: isActive(href) ? '#eff6ff' : 'transparent',
                                                        transition: 'background 0.15s',
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
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '12px',
                                                        padding: '10px 12px',
                                                        color: '#7c3aed',
                                                        textDecoration: 'none',
                                                        borderRadius: '10px',
                                                        fontSize: '0.9375rem',
                                                        fontWeight: 500,
                                                        transition: 'background 0.15s',
                                                    }}
                                                >
                                                    <ShieldIcon className="w-5 h-5" />
                                                    Admin Panel
                                                </Link>
                                            )}
                                        </div>

                                        {/* Logout */}
                                        <div style={{ borderTop: '1px solid #f1f5f9', padding: '8px' }}>
                                            <button
                                                onClick={handleLogoutClick}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '12px',
                                                    width: '100%',
                                                    padding: '10px 12px',
                                                    color: '#dc2626',
                                                    border: 'none',
                                                    background: 'none',
                                                    borderRadius: '10px',
                                                    fontSize: '0.9375rem',
                                                    cursor: 'pointer',
                                                    transition: 'background 0.15s',
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
                                <Link href="/login" style={{
                                    color: '#64748b',
                                    textDecoration: 'none',
                                    fontWeight: 500,
                                    fontSize: '0.9375rem',
                                    padding: '8px 16px',
                                    borderRadius: '8px',
                                    transition: 'color 0.15s',
                                }}>
                                    เข้าสู่ระบบ
                                </Link>
                                <Link href="/register" className="btn btn-primary" style={{ padding: '8px 20px', fontSize: '0.9375rem' }}>
                                    สมัครเรียน
                                </Link>
                            </>
                        )}
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        className="nav-mobile-btn"
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        aria-label="Toggle menu"
                        style={{
                            display: 'none',
                            padding: '8px',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
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
                        className="nav-mobile-only"
                        style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            background: 'white',
                            zIndex: 50,
                            borderBottom: '1px solid #e2e8f0',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
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
                                        color: '#1e293b',
                                        fontSize: '0.9375rem',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                    }}>
                                        {session.user?.name || 'ผู้ใช้'}
                                    </div>
                                    <div style={{
                                        color: '#94a3b8',
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
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        padding: '12px 16px',
                                        fontSize: '0.9375rem',
                                        color: isActive(href) ? '#2563eb' : '#374151',
                                        fontWeight: isActive(href) ? 600 : 500,
                                        borderRadius: '10px',
                                        background: isActive(href) ? '#eff6ff' : 'transparent',
                                        textDecoration: 'none',
                                        transition: 'all 0.15s',
                                    }}
                                >
                                    <Icon className="w-5 h-5" />
                                    {label}
                                </Link>
                            ))}
                        </div>

                        <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9', margin: '12px 0' }} />

                        {session ? (
                            <>
                                {/* User Menu Links */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' }}>
                                    {USER_MENU_LINKS.map(({ href, label, icon: Icon }) => (
                                        <Link
                                            key={href}
                                            href={href}
                                            onClick={() => setIsMenuOpen(false)}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '12px',
                                                padding: '12px 16px',
                                                fontSize: '0.9375rem',
                                                color: isActive(href) ? '#2563eb' : '#374151',
                                                fontWeight: isActive(href) ? 600 : 500,
                                                borderRadius: '10px',
                                                background: isActive(href) ? '#eff6ff' : 'transparent',
                                                textDecoration: 'none',
                                                transition: 'all 0.15s',
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
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '12px',
                                                padding: '12px 16px',
                                                fontSize: '0.9375rem',
                                                color: '#7c3aed',
                                                fontWeight: 500,
                                                borderRadius: '10px',
                                                textDecoration: 'none',
                                                transition: 'all 0.15s',
                                            }}
                                        >
                                            <ShieldIcon className="w-5 h-5" />
                                            Admin Panel
                                        </Link>
                                    )}
                                </div>

                                <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9', margin: '12px 0' }} />

                                <button
                                    onClick={handleLogoutClick}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        width: '100%',
                                        padding: '12px 16px',
                                        fontSize: '0.9375rem',
                                        color: '#dc2626',
                                        fontWeight: 500,
                                        borderRadius: '10px',
                                        border: 'none',
                                        background: 'none',
                                        cursor: 'pointer',
                                        transition: 'background 0.15s',
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
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        padding: '14px',
                                        color: '#374151',
                                        border: '2px solid #e2e8f0',
                                        borderRadius: '12px',
                                        fontWeight: 600,
                                        fontSize: '0.9375rem',
                                        textDecoration: 'none',
                                        transition: 'all 0.15s',
                                    }}
                                >
                                    <LoginIcon className="w-5 h-5" />
                                    เข้าสู่ระบบ
                                </Link>
                                <Link
                                    href="/register"
                                    onClick={() => setIsMenuOpen(false)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        padding: '14px',
                                        color: 'white',
                                        background: '#2563eb',
                                        borderRadius: '12px',
                                        fontWeight: 600,
                                        fontSize: '0.9375rem',
                                        textDecoration: 'none',
                                        transition: 'all 0.15s',
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
                .nav-mobile-btn { display: none !important; }
                .nav-mobile-only { display: block; }

                @media (max-width: 768px) {
                    .nav-desktop { display: none !important; }
                    .nav-mobile-btn { display: flex !important; }
                }

                @media (min-width: 769px) {
                    .nav-mobile-only { display: none !important; }
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

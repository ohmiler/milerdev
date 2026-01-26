'use client';

import Link from 'next/link';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
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
    InfoIcon,
    MailIcon,
} from '@/components/ui/Icons';

// Navigation links config
const NAV_LINKS = [
    { href: '/courses', label: 'คอร์สทั้งหมด', icon: BookIcon },
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
    const sizeClasses = {
        sm: 'w-8 h-8 text-xs',
        md: 'w-9 h-9 text-sm',
        lg: 'w-11 h-11 text-sm',
    };
    
    if (image) {
        return (
            <img
                src={image}
                alt={name || 'Avatar'}
                className={`${sizeClasses[size]} rounded-full object-cover border-2 border-blue-100`}
            />
        );
    }
    
    return (
        <div className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold`}>
            {name?.charAt(0).toUpperCase() || 'U'}
        </div>
    );
}

// Logo component
function Logo() {
    return (
        <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">M</span>
            </div>
            <span className="font-bold text-xl text-gray-800">MilerDev</span>
        </Link>
    );
}

// Desktop User Dropdown
function UserDropdown({
    session,
    isOpen,
    onToggle,
    onLogout,
    dropdownRef,
}: {
    session: { user?: { name?: string | null; email?: string | null; image?: string | null; role?: string } };
    isOpen: boolean;
    onToggle: () => void;
    onLogout: () => void;
    dropdownRef: React.RefObject<HTMLDivElement | null>;
}) {
    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={onToggle}
                className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors cursor-pointer px-2 py-1"
            >
                <Avatar image={session.user?.image} name={session.user?.name} />
                <span className="font-medium max-w-[150px] truncate">
                    {session.user?.name || 'ผู้ใช้'}
                </span>
                <ChevronDownIcon className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-3 w-64 bg-white rounded-2xl border border-gray-200 shadow-2xl py-3 z-[100]">
                    {/* Menu Links */}
                    <div style={{ padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {USER_MENU_LINKS.map(({ href, label, icon: Icon }) => (
                            <Link
                                key={href}
                                href={href}
                                style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '14px 16px', fontSize: '16px', color: '#374151', borderRadius: '12px' }}
                                className="hover:bg-gray-50 transition-colors"
                                onClick={onToggle}
                            >
                                <Icon className="w-5 h-5 text-gray-500" />
                                {label}
                            </Link>
                        ))}
                    </div>

                    {/* Logout */}
                    <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '16px', marginTop: '8px', padding: '16px 12px' }}>
                        <button
                            onClick={onLogout}
                            style={{ display: 'flex', alignItems: 'center', gap: '16px', width: '100%', padding: '14px 16px', fontSize: '16px', color: '#dc2626', borderRadius: '12px' }}
                            className="hover:bg-red-50 transition-colors cursor-pointer"
                        >
                            <LogoutIcon className="w-5 h-5" />
                            ออกจากระบบ
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// Mobile Menu (Dropdown style)
function MobileMenu({
    isOpen,
    session,
    onClose,
    onLogout,
}: {
    isOpen: boolean;
    session: { user?: { name?: string | null; email?: string | null; image?: string | null; role?: string } } | null;
    onClose: () => void;
    onLogout: () => void;
}) {
    return (
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 bg-black/30 z-40 md:hidden transition-opacity duration-200 ${
                    isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
                onClick={onClose}
            />

            {/* Dropdown Menu Panel */}
            <div
                className={`md:hidden fixed top-16 left-0 right-0 bg-white z-50 border-b border-gray-200 shadow-xl transition-all duration-200 ease-out overflow-hidden ${
                    isOpen 
                        ? 'max-h-[calc(100vh-4rem)] opacity-100' 
                        : 'max-h-0 opacity-0'
                }`}
            >
                <div className="py-6 px-4 max-h-[calc(100vh-4rem)] overflow-y-auto">

                    {/* Navigation Links */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                        {NAV_LINKS.map(({ href, label, icon: Icon }) => (
                            <Link
                                key={href}
                                href={href}
                                style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '14px 16px', fontSize: '16px', color: '#374151', borderRadius: '12px', fontWeight: 500 }}
                                className="hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                onClick={onClose}
                            >
                                <Icon className="w-5 h-5" />
                                {label}
                            </Link>
                        ))}
                    </div>

                    <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '24px 0' }} />

                    {session ? (
                        <>
                            {/* User Menu Links */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                                {USER_MENU_LINKS.map(({ href, label, icon: Icon }) => (
                                    <Link
                                        key={href}
                                        href={href}
                                        style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '14px 16px', fontSize: '16px', color: '#374151', borderRadius: '12px', fontWeight: 500 }}
                                        className="hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                        onClick={onClose}
                                    >
                                        <Icon className="w-5 h-5" />
                                        {label}
                                    </Link>
                                ))}
                            </div>

                            <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '24px 0' }} />

                            <button
                                onClick={onLogout}
                                style={{ display: 'flex', alignItems: 'center', gap: '16px', width: '100%', padding: '14px 16px', fontSize: '16px', color: '#dc2626', borderRadius: '12px', fontWeight: 500 }}
                                className="hover:bg-red-50 transition-colors cursor-pointer"
                            >
                                <LogoutIcon className="w-5 h-5" />
                                ออกจากระบบ
                            </button>
                        </>
                    ) : (
                        <div className="flex flex-col gap-4 pt-2">
                            <Link
                                href="/login"
                                className="flex items-center justify-center gap-3 py-4 text-gray-700 hover:text-blue-600 border-2 border-gray-200 hover:border-blue-200 rounded-xl transition-colors font-semibold text-base"
                                onClick={onClose}
                            >
                                <LoginIcon className="w-5 h-5" />
                                เข้าสู่ระบบ
                            </Link>
                            <Link
                                href="/register"
                                className="flex items-center justify-center gap-3 py-4 text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors font-semibold text-base"
                                onClick={onClose}
                            >
                                <RegisterIcon className="w-5 h-5" />
                                สมัครเรียน
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

// Main Navbar Component
export default function Navbar() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [showLogoutDialog, setShowLogoutDialog] = useState(false);
    const [showUserDropdown, setShowUserDropdown] = useState(false);
    const { data: session, status } = useSession();
    const dropdownRef = useRef<HTMLDivElement>(null);

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

    // Prevent body scroll when mobile menu is open (only for full-screen menus)
    // Removed since we're using dropdown style now

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
            <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200">
                <div className="container">
                    <div className="flex items-center justify-between h-16">
                        {/* Logo */}
                        <Logo />

                        {/* Desktop Navigation */}
                        <div className="hidden md:flex items-center gap-8">
                            {NAV_LINKS.map(({ href, label }) => (
                                <Link
                                    key={href}
                                    href={href}
                                    className="text-gray-600 hover:text-blue-600 transition-colors"
                                >
                                    {label}
                                </Link>
                            ))}
                        </div>

                        {/* Desktop Auth */}
                        <div className="hidden md:flex items-center gap-4">
                            {status === 'loading' ? (
                                <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
                            ) : session ? (
                                <UserDropdown
                                    session={session}
                                    isOpen={showUserDropdown}
                                    onToggle={() => setShowUserDropdown(!showUserDropdown)}
                                    onLogout={handleLogoutClick}
                                    dropdownRef={dropdownRef as React.RefObject<HTMLDivElement>}
                                />
                            ) : (
                                <>
                                    <Link href="/login" className="text-gray-600 hover:text-blue-600 transition-colors font-medium">
                                        เข้าสู่ระบบ
                                    </Link>
                                    <Link href="/register" className="btn btn-primary">
                                        สมัครเรียน
                                    </Link>
                                </>
                            )}
                        </div>

                        {/* Mobile Menu Button */}
                        <button
                            className="md:hidden p-2"
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            aria-label="Toggle menu"
                        >
                            {isMenuOpen ? (
                                <CloseIcon className="w-6 h-6 text-gray-600" />
                            ) : (
                                <MenuIcon className="w-6 h-6 text-gray-600" />
                            )}
                        </button>
                    </div>
                </div>
            </nav>

            {/* Mobile Menu */}
            <MobileMenu
                isOpen={isMenuOpen}
                session={session}
                onClose={() => setIsMenuOpen(false)}
                onLogout={handleLogoutClick}
            />

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

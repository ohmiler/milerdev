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
    session: any;
    isOpen: boolean;
    onToggle: () => void;
    onLogout: () => void;
    dropdownRef: React.RefObject<HTMLDivElement>;
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
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl border border-gray-200 shadow-xl py-2 z-[100]">
                    {/* User Info */}
                    <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-sm font-semibold text-gray-800 truncate">
                            {session.user?.name || 'ผู้ใช้'}
                        </p>
                        <p className="text-xs text-gray-500 truncate mt-0.5">
                            {session.user?.email || ''}
                        </p>
                    </div>

                    {/* Menu Links */}
                    <div className="py-2">
                        {USER_MENU_LINKS.map(({ href, label, icon: Icon }) => (
                            <Link
                                key={href}
                                href={href}
                                className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                onClick={onToggle}
                            >
                                <Icon className="w-4 h-4" />
                                {label}
                            </Link>
                        ))}
                    </div>

                    {/* Logout */}
                    <div className="border-t border-gray-100 pt-2">
                        <button
                            onClick={onLogout}
                            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                        >
                            <LogoutIcon className="w-4 h-4" />
                            ออกจากระบบ
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// Mobile Menu
function MobileMenu({
    isOpen,
    session,
    onClose,
    onLogout,
}: {
    isOpen: boolean;
    session: any;
    onClose: () => void;
    onLogout: () => void;
}) {
    return (
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity duration-300 ${
                    isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
                onClick={onClose}
            />

            {/* Menu Panel */}
            <div
                className={`md:hidden fixed top-16 left-0 right-0 bottom-0 bg-white z-50 transition-transform duration-300 ease-out overflow-y-auto ${
                    isOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
            >
                <div className="py-4 flex flex-col">
                    {/* User Info */}
                    {session && (
                        <div className="flex items-center gap-3 px-4 py-3 mb-2 mx-4 bg-gray-50 rounded-xl">
                            <Avatar image={session.user?.image} name={session.user?.name} size="lg" />
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-gray-800 truncate text-sm">
                                    {session.user?.name || 'ผู้ใช้'}
                                </p>
                                <p className="text-xs text-blue-500 truncate">
                                    {session.user?.email || ''}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Navigation Links */}
                    {NAV_LINKS.map(({ href, label, icon: Icon }) => (
                        <Link
                            key={href}
                            href={href}
                            className="flex items-center gap-3 px-6 py-3 text-gray-600 hover:text-blue-600 hover:bg-gray-50 transition-colors"
                            onClick={onClose}
                        >
                            <Icon className="w-5 h-5" />
                            {label}
                        </Link>
                    ))}

                    <hr className="border-gray-100 my-2 mx-4" />

                    {session ? (
                        <>
                            {/* User Menu Links */}
                            {USER_MENU_LINKS.map(({ href, label, icon: Icon }) => (
                                <Link
                                    key={href}
                                    href={href}
                                    className="flex items-center gap-3 px-6 py-3 text-gray-600 hover:text-blue-600 hover:bg-gray-50 transition-colors"
                                    onClick={onClose}
                                >
                                    <Icon className="w-5 h-5" />
                                    {label}
                                </Link>
                            ))}

                            <hr className="border-gray-100 my-2 mx-4" />

                            <button
                                onClick={onLogout}
                                className="flex items-center gap-3 w-full px-6 py-3 text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            >
                                <LogoutIcon className="w-5 h-5" />
                                ออกจากระบบ
                            </button>
                        </>
                    ) : (
                        <div className="flex flex-col gap-3 px-4 pt-2">
                            <Link
                                href="/login"
                                className="flex items-center justify-center gap-3 py-3 text-gray-600 hover:text-blue-600 border border-gray-200 rounded-xl transition-colors font-medium"
                                onClick={onClose}
                            >
                                <LoginIcon className="w-5 h-5" />
                                เข้าสู่ระบบ
                            </Link>
                            <Link
                                href="/register"
                                className="flex items-center justify-center gap-3 py-3 text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors font-medium"
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

    // Prevent body scroll when mobile menu is open
    useEffect(() => {
        document.body.style.overflow = isMenuOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [isMenuOpen]);

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

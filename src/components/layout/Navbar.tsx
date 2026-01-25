'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

export default function Navbar() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [showLogoutDialog, setShowLogoutDialog] = useState(false);
    const [showUserDropdown, setShowUserDropdown] = useState(false);
    const { data: session, status } = useSession();
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close menus on ESC key press
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setIsMenuOpen(false);
                setShowUserDropdown(false);
            }
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, []);

    // Close mobile menu on window resize
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

    const closeMobileMenu = () => setIsMenuOpen(false);

    return (
        <>
            {/* Navbar */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200" style={{ backgroundColor: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)' }}>
                <div className="container">
                    <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold text-sm">M</span>
                        </div>
                        <span className="font-bold text-xl text-gray-800">MilerDev</span>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center gap-8">
                        <Link href="/courses" className="text-gray-600 hover:text-blue-600 transition-colors">
                            คอร์สทั้งหมด
                        </Link>
                        <Link href="/about" className="text-gray-600 hover:text-blue-600 transition-colors">
                            เกี่ยวกับเรา
                        </Link>
                        <Link href="/contact" className="text-gray-600 hover:text-blue-600 transition-colors">
                            ติดต่อ
                        </Link>
                    </div>

                    {/* Auth Buttons */}
                    <div className="hidden md:flex items-center gap-4">
                        {status === 'loading' ? (
                            <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
                        ) : session ? (
                            <div className="relative" ref={dropdownRef}>
                                <button
                                    onClick={() => setShowUserDropdown(!showUserDropdown)}
                                    className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors cursor-pointer px-2 py-1"
                                >
                                    {/* Avatar */}
                                    {session.user?.image ? (
                                        <img 
                                            src={session.user.image} 
                                            alt={session.user.name || 'Avatar'} 
                                            className="w-9 h-9 rounded-full object-cover border-2 border-blue-100"
                                        />
                                    ) : (
                                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-sm font-bold">
                                            {session.user?.name?.charAt(0).toUpperCase() || 'U'}
                                        </div>
                                    )}
                                    <span className="font-medium max-w-[150px] truncate">
                                        {session.user?.name || 'ผู้ใช้'}
                                    </span>
                                    <svg 
                                        className={`w-4 h-4 transition-transform ${showUserDropdown ? 'rotate-180' : ''}`} 
                                        fill="none" 
                                        stroke="currentColor" 
                                        viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>

                                {/* Dropdown Menu */}
                                {showUserDropdown && (
                                <div 
                                    className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-gray-200 py-2 z-[100]"
                                    style={{ 
                                        backgroundColor: '#ffffff',
                                        boxShadow: '0 10px 40px rgba(0,0,0,0.15)'
                                    }}
                                >
                                            {/* User Info Header */}
                                            <div className="px-4 py-3 border-b border-gray-100">
                                                <p className="text-sm font-semibold text-gray-800 truncate">
                                                    {session.user?.name || 'ผู้ใช้'}
                                                </p>
                                                <p className="text-xs text-gray-500 truncate mt-0.5">
                                                    {session.user?.email || ''}
                                                </p>
                                            </div>

                                            {/* Menu Items */}
                                            <div className="py-2">
                                                <Link 
                                                    href="/dashboard" 
                                                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                                    onClick={() => setShowUserDropdown(false)}
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                                    </svg>
                                                    แดชบอร์ด
                                                </Link>
                                                <Link 
                                                    href="/profile" 
                                                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                                    onClick={() => setShowUserDropdown(false)}
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                    </svg>
                                                    โปรไฟล์
                                                </Link>
                                                <Link 
                                                    href="/settings" 
                                                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                                    onClick={() => setShowUserDropdown(false)}
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    </svg>
                                                    ตั้งค่า
                                                </Link>
                                            </div>

                                            {/* Logout */}
                                            <div className="border-t border-gray-100 pt-2">
                                                <button
                                                    onClick={() => {
                                                        setShowUserDropdown(false);
                                                        setShowLogoutDialog(true);
                                                    }}
                                                    className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                                    </svg>
                                                    Logout
                                                </button>
                                            </div>
                                        </div>
                                )}
                            </div>
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
                        <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {isMenuOpen ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            )}
                        </svg>
                    </button>
                </div>

            </div>
        </nav>

            {/* Mobile Menu Backdrop - Outside nav for proper fixed positioning */}
            <div 
                className={`fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity duration-300 ${
                    isMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
                onClick={() => setIsMenuOpen(false)}
            />

            {/* Mobile Menu - Outside nav for proper fixed positioning */}
            <div 
                className={`md:hidden fixed top-16 left-0 right-0 bottom-0 bg-white z-50 transition-transform duration-300 ease-out overflow-y-auto ${
                    isMenuOpen 
                        ? 'translate-x-0' 
                        : '-translate-x-full'
                }`}
                style={{ backgroundColor: '#ffffff' }}
            >
                <div className="py-4">
                    <div className="flex flex-col">
                            {/* User Info (if logged in) */}
                            {session && (
                                <div className="flex items-center gap-3 px-4 py-3 mb-2 mx-4 bg-gray-50 rounded-xl">
                                    {session.user?.image ? (
                                        <img 
                                            src={session.user.image} 
                                            alt={session.user.name || 'Avatar'} 
                                            className="w-11 h-11 rounded-full object-cover border-2 border-blue-100"
                                        />
                                    ) : (
                                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-sm font-bold">
                                            {session.user?.name?.charAt(0).toUpperCase() || 'U'}
                                        </div>
                                    )}
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
                            <Link 
                                href="/courses" 
                                className="flex items-center gap-3 px-6 py-3 text-gray-600 hover:text-blue-600 hover:bg-gray-50 transition-colors"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                                คอร์สทั้งหมด
                            </Link>
                            <Link 
                                href="/about" 
                                className="flex items-center gap-3 px-6 py-3 text-gray-600 hover:text-blue-600 hover:bg-gray-50 transition-colors"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                เกี่ยวกับเรา
                            </Link>
                            <Link 
                                href="/contact" 
                                className="flex items-center gap-3 px-6 py-3 text-gray-600 hover:text-blue-600 hover:bg-gray-50 transition-colors"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                ติดต่อ
                            </Link>

                            <hr className="border-gray-100 my-2 mx-4" />

                            {session ? (
                                <>
                                    {/* User Menu Items */}
                                    <Link 
                                        href="/dashboard" 
                                        className="flex items-center gap-3 px-6 py-3 text-gray-600 hover:text-blue-600 hover:bg-gray-50 transition-colors"
                                        onClick={() => setIsMenuOpen(false)}
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                        </svg>
                                        แดชบอร์ด
                                    </Link>
                                    <Link 
                                        href="/profile" 
                                        className="flex items-center gap-3 px-6 py-3 text-gray-600 hover:text-blue-600 hover:bg-gray-50 transition-colors"
                                        onClick={() => setIsMenuOpen(false)}
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                        โปรไฟล์
                                    </Link>
                                    <Link 
                                        href="/settings" 
                                        className="flex items-center gap-3 px-6 py-3 text-gray-600 hover:text-blue-600 hover:bg-gray-50 transition-colors"
                                        onClick={() => setIsMenuOpen(false)}
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        ตั้งค่า
                                    </Link>

                                    <hr className="border-gray-100 my-2 mx-4" />

                                    <button
                                        onClick={() => {
                                            setIsMenuOpen(false);
                                            setShowLogoutDialog(true);
                                        }}
                                        className="flex items-center gap-3 w-full px-6 py-3 text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                        </svg>
                                        Logout
                                    </button>
                                </>
                            ) : (
                                <div className="flex flex-col gap-3 px-4 pt-2">
                                    <Link 
                                        href="/login" 
                                        className="flex items-center justify-center gap-3 py-3 text-gray-600 hover:text-blue-600 border border-gray-200 rounded-xl transition-colors font-medium"
                                        onClick={() => setIsMenuOpen(false)}
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                                        </svg>
                                        เข้าสู่ระบบ
                                    </Link>
                                    <Link 
                                        href="/register" 
                                        className="flex items-center justify-center gap-3 py-3 text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors font-medium"
                                        onClick={() => setIsMenuOpen(false)}
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                        </svg>
                                        สมัครเรียน
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
        
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
            confirmText="Logout"
            cancelText="ยกเลิก"
        />
        </>
    );
}

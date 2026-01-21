'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function Navbar() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
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
                        <Link href="/login" className="text-gray-600 hover:text-blue-600 transition-colors font-medium">
                            เข้าสู่ระบบ
                        </Link>
                        <Link href="/register" className="btn btn-primary">
                            สมัครเรียน
                        </Link>
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

                {/* Mobile Menu */}
                {isMenuOpen && (
                    <div className="md:hidden py-4 border-t border-gray-100">
                        <div className="flex flex-col gap-4">
                            <Link href="/courses" className="text-gray-600 hover:text-blue-600 transition-colors">
                                คอร์สทั้งหมด
                            </Link>
                            <Link href="/about" className="text-gray-600 hover:text-blue-600 transition-colors">
                                เกี่ยวกับเรา
                            </Link>
                            <Link href="/contact" className="text-gray-600 hover:text-blue-600 transition-colors">
                                ติดต่อ
                            </Link>
                            <hr className="border-gray-100" />
                            <Link href="/login" className="text-gray-600 hover:text-blue-600 transition-colors font-medium">
                                เข้าสู่ระบบ
                            </Link>
                            <Link href="/register" className="btn btn-primary text-center">
                                สมัครเรียน
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </nav>
    );
}

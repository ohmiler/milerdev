'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface AdminHeaderProps {
    userName: string;
}

const navLinks = [
    { href: '/admin/courses', label: 'คอร์ส' },
    { href: '/admin/users', label: 'ผู้ใช้' },
    { href: '/admin/payments', label: 'การชำระเงิน' },
    { href: '/admin/enrollments', label: 'การลงทะเบียน' },
    { href: '/admin/reports', label: 'รายงาน' },
    { href: '/admin/media', label: 'ไฟล์สื่อ' },
    { href: '/admin/tags', label: 'แท็ก' },
    { href: '/admin/settings', label: 'ตั้งค่า' },
    { href: '/admin/audit-logs', label: 'Logs' },
    { href: '/admin/announcements', label: 'ประกาศ' },
];

export default function AdminHeader({ userName }: AdminHeaderProps) {
    const [menuOpen, setMenuOpen] = useState(false);
    const pathname = usePathname();

    const isActive = (href: string) => {
        if (href === '/admin') return pathname === '/admin';
        return pathname.startsWith(href);
    };

    return (
        <header style={{ background: '#1e293b', position: 'relative' }}>
            {/* Top Bar */}
            <div style={{
                padding: '0 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                height: '56px',
            }}>
                <Link href="/admin" style={{
                    color: 'white',
                    fontSize: '1.125rem',
                    fontWeight: 700,
                    textDecoration: 'none',
                    whiteSpace: 'nowrap',
                }}>
                    🛠️ Admin
                </Link>

                {/* Desktop Nav */}
                <nav className="admin-nav-desktop">
                    {navLinks.map(link => (
                        <Link
                            key={link.href}
                            href={link.href}
                            style={{
                                color: isActive(link.href) ? '#ffffff' : '#94a3b8',
                                textDecoration: 'none',
                                fontSize: '0.8125rem',
                                fontWeight: isActive(link.href) ? 600 : 400,
                                padding: '6px 10px',
                                borderRadius: '6px',
                                background: isActive(link.href) ? 'rgba(255,255,255,0.1)' : 'transparent',
                                transition: 'all 0.15s',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {link.label}
                        </Link>
                    ))}
                </nav>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span className="admin-user-name" style={{
                        color: '#94a3b8',
                        fontSize: '0.8125rem',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: '120px',
                    }}>
                        {userName}
                    </span>
                    <Link href="/" className="admin-back-link" style={{
                        color: '#94a3b8',
                        textDecoration: 'none',
                        fontSize: '0.8125rem',
                        whiteSpace: 'nowrap',
                    }}>
                        กลับหน้าเว็บ
                    </Link>

                    {/* Hamburger Button (mobile only) */}
                    <button
                        className="admin-menu-btn"
                        onClick={() => setMenuOpen(!menuOpen)}
                        aria-label="Toggle menu"
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'white',
                            cursor: 'pointer',
                            padding: '8px',
                            display: 'none',
                        }}
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            {menuOpen ? (
                                <>
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </>
                            ) : (
                                <>
                                    <line x1="3" y1="6" x2="21" y2="6" />
                                    <line x1="3" y1="12" x2="21" y2="12" />
                                    <line x1="3" y1="18" x2="21" y2="18" />
                                </>
                            )}
                        </svg>
                    </button>
                </div>
            </div>

            {/* Mobile Nav Dropdown */}
            {menuOpen && (
                <nav
                    className="admin-nav-mobile"
                    style={{
                        position: 'absolute',
                        top: '56px',
                        left: 0,
                        right: 0,
                        background: '#1e293b',
                        borderTop: '1px solid #334155',
                        padding: '8px',
                        display: 'none',
                        zIndex: 50,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    }}
                >
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, 1fr)',
                        gap: '4px',
                    }}>
                        {navLinks.map(link => (
                            <Link
                                key={link.href}
                                href={link.href}
                                onClick={() => setMenuOpen(false)}
                                style={{
                                    color: isActive(link.href) ? '#ffffff' : '#94a3b8',
                                    textDecoration: 'none',
                                    fontSize: '0.875rem',
                                    fontWeight: isActive(link.href) ? 600 : 400,
                                    padding: '10px 12px',
                                    borderRadius: '8px',
                                    background: isActive(link.href) ? 'rgba(255,255,255,0.1)' : 'transparent',
                                    transition: 'all 0.15s',
                                }}
                            >
                                {link.label}
                            </Link>
                        ))}
                    </div>
                    <div style={{
                        borderTop: '1px solid #334155',
                        marginTop: '8px',
                        paddingTop: '8px',
                    }}>
                        <Link
                            href="/"
                            onClick={() => setMenuOpen(false)}
                            style={{
                                display: 'block',
                                color: '#94a3b8',
                                textDecoration: 'none',
                                fontSize: '0.875rem',
                                padding: '10px 12px',
                                borderRadius: '8px',
                            }}
                        >
                            ← กลับหน้าเว็บ
                        </Link>
                    </div>
                </nav>
            )}

            {/* Responsive Styles */}
            <style>{`
                .admin-nav-desktop {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }
                .admin-menu-btn { display: none !important; }
                .admin-nav-mobile { display: none !important; }

                @media (max-width: 1024px) {
                    .admin-nav-desktop { display: none !important; }
                    .admin-menu-btn { display: flex !important; }
                    .admin-nav-mobile { display: block !important; }
                    .admin-user-name { display: none !important; }
                    .admin-back-link { display: none !important; }
                }
            `}</style>
        </header>
    );
}

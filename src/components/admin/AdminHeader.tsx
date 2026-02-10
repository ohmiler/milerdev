'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface AdminHeaderProps {
    userName: string;
}

const primaryLinks = [
    { href: '/admin', label: 'แดชบอร์ด', icon: 'dashboard', exact: true },
    { href: '/admin/courses', label: 'คอร์ส', icon: 'courses' },
    { href: '/admin/blog', label: 'บทความ', icon: 'blog' },
    { href: '/admin/users', label: 'ผู้ใช้', icon: 'users' },
    { href: '/admin/payments', label: 'การชำระเงิน', icon: 'payments' },
    { href: '/admin/enrollments', label: 'การลงทะเบียน', icon: 'enrollments' },
];

const secondaryLinks = [
    { href: '/admin/coupons', label: 'คูปอง', icon: 'coupons' },
    { href: '/admin/certificates', label: 'ใบรับรอง', icon: 'certificates' },
    { href: '/admin/reviews', label: 'รีวิว', icon: 'reviews' },
    { href: '/admin/reports', label: 'รายงาน', icon: 'reports' },
    { href: '/admin/media', label: 'ไฟล์สื่อ', icon: 'media' },
    { href: '/admin/tags', label: 'แท็ก', icon: 'tags' },
    { href: '/admin/announcements', label: 'ประกาศ', icon: 'announcements' },
    { href: '/admin/audit-logs', label: 'บันทึกระบบ', icon: 'logs' },
    { href: '/admin/settings', label: 'ตั้งค่า', icon: 'settings' },
];

const allLinks = [...primaryLinks, ...secondaryLinks];

function NavIcon({ name, size = 16 }: { name: string; size?: number }) {
    const s = { width: size, height: size, flexShrink: 0 };
    const p = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
    switch (name) {
        case 'dashboard': return <svg style={s} viewBox="0 0 24 24" {...p}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>;
        case 'courses': return <svg style={s} viewBox="0 0 24 24" {...p}><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>;
        case 'users': return <svg style={s} viewBox="0 0 24 24" {...p}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>;
        case 'payments': return <svg style={s} viewBox="0 0 24 24" {...p}><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>;
        case 'enrollments': return <svg style={s} viewBox="0 0 24 24" {...p}><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/></svg>;
        case 'reports': return <svg style={s} viewBox="0 0 24 24" {...p}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>;
        case 'media': return <svg style={s} viewBox="0 0 24 24" {...p}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>;
        case 'tags': return <svg style={s} viewBox="0 0 24 24" {...p}><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>;
        case 'announcements': return <svg style={s} viewBox="0 0 24 24" {...p}><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>;
        case 'coupons': return <svg style={s} viewBox="0 0 24 24" {...p}><path d="M2 9a3 3 0 003 3v0a3 3 0 003-3V5H2v4z"/><path d="M22 9a3 3 0 01-3 3v0a3 3 0 01-3-3V5h6v4z"/><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="6" y2="10"/><line x1="18" y1="10" x2="22" y2="10"/><line x1="12" y1="5" x2="12" y2="19"/></svg>;
        case 'certificates': return <svg style={s} viewBox="0 0 24 24" {...p}><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>;
        case 'reviews': return <svg style={s} viewBox="0 0 24 24" {...p}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>;
        case 'logs': return <svg style={s} viewBox="0 0 24 24" {...p}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>;
        case 'settings': return <svg style={s} viewBox="0 0 24 24" {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>;
        default: return null;
    }
}

export default function AdminHeader({ userName }: AdminHeaderProps) {
    const [menuOpen, setMenuOpen] = useState(false);
    const [moreOpen, setMoreOpen] = useState(false);
    const moreRef = useRef<HTMLDivElement>(null);
    const pathname = usePathname();

    const isActive = (href: string, exact?: boolean) => {
        if (exact) return pathname === href;
        return pathname.startsWith(href);
    };

    const isSecondaryActive = secondaryLinks.some(l => pathname.startsWith(l.href));

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
                setMoreOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    return (
        <header style={{ background: '#0f172a', position: 'relative', borderBottom: '1px solid #1e293b' }}>
            <div style={{
                padding: '0 20px',
                display: 'flex',
                alignItems: 'center',
                height: '56px',
                gap: '8px',
            }}>
                {/* Logo */}
                <Link href="/admin" style={{
                    color: 'white',
                    fontSize: '1rem',
                    fontWeight: 700,
                    textDecoration: 'none',
                    whiteSpace: 'nowrap',
                    marginRight: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                }}>
                    <span style={{
                        background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                        borderRadius: '8px',
                        width: '32px',
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.875rem',
                    }}>
                        M
                    </span>
                    <span className="admin-logo-text">Admin</span>
                </Link>

                {/* Desktop Nav - Primary */}
                <nav className="admin-nav-desktop" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2px',
                    flex: 1,
                }}>
                    {primaryLinks.map(link => (
                        <Link
                            key={link.href}
                            href={link.href}
                            style={{
                                color: isActive(link.href, link.exact) ? '#ffffff' : '#94a3b8',
                                textDecoration: 'none',
                                fontSize: '0.8125rem',
                                fontWeight: isActive(link.href, link.exact) ? 600 : 400,
                                padding: '8px 12px',
                                borderRadius: '8px',
                                background: isActive(link.href, link.exact) ? 'rgba(59,130,246,0.15)' : 'transparent',
                                transition: 'all 0.15s',
                                whiteSpace: 'nowrap',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                            }}
                        >
                            <NavIcon name={link.icon} size={15} />
                            {link.label}
                        </Link>
                    ))}

                    {/* More Dropdown */}
                    <div ref={moreRef} style={{ position: 'relative' }}>
                        <button
                            onClick={() => setMoreOpen(!moreOpen)}
                            style={{
                                color: isSecondaryActive ? '#ffffff' : '#94a3b8',
                                background: moreOpen || isSecondaryActive ? 'rgba(59,130,246,0.15)' : 'transparent',
                                border: 'none',
                                fontSize: '0.8125rem',
                                fontWeight: isSecondaryActive ? 600 : 400,
                                padding: '8px 12px',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                whiteSpace: 'nowrap',
                                transition: 'all 0.15s',
                            }}
                        >
                            เพิ่มเติม
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: moreOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
                                <polyline points="6 9 12 15 18 9" />
                            </svg>
                        </button>

                        {moreOpen && (
                            <div style={{
                                position: 'absolute',
                                top: 'calc(100% + 8px)',
                                left: 0,
                                background: '#1e293b',
                                borderRadius: '12px',
                                padding: '6px',
                                minWidth: '200px',
                                boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
                                border: '1px solid #334155',
                                zIndex: 100,
                            }}>
                                {secondaryLinks.map(link => (
                                    <Link
                                        key={link.href}
                                        href={link.href}
                                        onClick={() => setMoreOpen(false)}
                                        style={{
                                            color: isActive(link.href) ? '#ffffff' : '#cbd5e1',
                                            textDecoration: 'none',
                                            fontSize: '0.8125rem',
                                            fontWeight: isActive(link.href) ? 600 : 400,
                                            padding: '10px 12px',
                                            borderRadius: '8px',
                                            background: isActive(link.href) ? 'rgba(59,130,246,0.15)' : 'transparent',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px',
                                            transition: 'background 0.1s',
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!isActive(link.href)) e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!isActive(link.href)) e.currentTarget.style.background = 'transparent';
                                        }}
                                    >
                                        <NavIcon name={link.icon} size={15} />
                                        {link.label}
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                </nav>

                {/* Right Side */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span className="admin-user-name" style={{
                        color: '#94a3b8',
                        fontSize: '0.8125rem',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: '140px',
                    }}>
                        {userName}
                    </span>
                    <Link href="/" className="admin-back-link" style={{
                        color: '#94a3b8',
                        textDecoration: 'none',
                        fontSize: '0.75rem',
                        whiteSpace: 'nowrap',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: '1px solid #334155',
                        transition: 'all 0.15s',
                    }}>
                        กลับหน้าเว็บ
                    </Link>

                    {/* Hamburger Button */}
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
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            {menuOpen ? (
                                <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>
                            ) : (
                                <><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></>
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
                        background: '#0f172a',
                        borderTop: '1px solid #1e293b',
                        padding: '8px',
                        display: 'none',
                        zIndex: 50,
                        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                        maxHeight: '80vh',
                        overflowY: 'auto',
                    }}
                >
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, 1fr)',
                        gap: '4px',
                    }}>
                        {allLinks.map(link => (
                            <Link
                                key={link.href}
                                href={link.href}
                                onClick={() => setMenuOpen(false)}
                                style={{
                                    color: isActive(link.href, (link as typeof primaryLinks[0]).exact) ? '#ffffff' : '#94a3b8',
                                    textDecoration: 'none',
                                    fontSize: '0.8125rem',
                                    fontWeight: isActive(link.href, (link as typeof primaryLinks[0]).exact) ? 600 : 400,
                                    padding: '12px',
                                    borderRadius: '8px',
                                    background: isActive(link.href, (link as typeof primaryLinks[0]).exact) ? 'rgba(59,130,246,0.15)' : 'transparent',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                }}
                            >
                                <NavIcon name={link.icon} size={16} />
                                {link.label}
                            </Link>
                        ))}
                    </div>
                    <div style={{
                        borderTop: '1px solid #1e293b',
                        marginTop: '8px',
                        paddingTop: '8px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 12px',
                    }}>
                        <span style={{ color: '#64748b', fontSize: '0.8125rem' }}>{userName}</span>
                        <Link
                            href="/"
                            onClick={() => setMenuOpen(false)}
                            style={{
                                color: '#94a3b8',
                                textDecoration: 'none',
                                fontSize: '0.8125rem',
                                padding: '6px 12px',
                                borderRadius: '6px',
                                border: '1px solid #334155',
                            }}
                        >
                            กลับหน้าเว็บ
                        </Link>
                    </div>
                </nav>
            )}

            <style>{`
                .admin-nav-desktop { display: flex; }
                .admin-menu-btn { display: none !important; }
                .admin-nav-mobile { display: none !important; }
                .admin-logo-text { display: inline; }

                @media (max-width: 1024px) {
                    .admin-nav-desktop { display: none !important; }
                    .admin-menu-btn { display: flex !important; }
                    .admin-nav-mobile { display: block !important; }
                    .admin-user-name { display: none !important; }
                    .admin-back-link { display: none !important; }
                }
                @media (max-width: 480px) {
                    .admin-logo-text { display: none !important; }
                }
            `}</style>
        </header>
    );
}

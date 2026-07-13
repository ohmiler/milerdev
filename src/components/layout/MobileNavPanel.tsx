'use client';

import type { Session } from 'next-auth';
import Link from 'next/link';
import { LoginIcon, LogoutIcon, RegisterIcon } from '@/components/ui/Icons';
import { NAV_LINKS, ShieldIcon, USER_MENU_LINKS, Avatar } from './navigation-config';

interface MobileNavPanelProps {
    session: Session | null;
    isAdmin: boolean;
    isActive: (href: string) => boolean;
    onClose: () => void;
    onLogout: () => void;
}

export default function MobileNavPanel({
    session,
    isAdmin,
    isActive,
    onClose,
    onLogout,
}: MobileNavPanelProps) {
    return (
        <div id="mobile-navigation" className="nav-public-mobile-panel" aria-label="เมนูหลัก">
            <div className="nav-mobile-panel-inner">
                <div className="nav-mobile-panel-header" aria-hidden="true">
                    <span>NAVIGATION</span>
                    <small>MILERDEV / TH</small>
                </div>
                {session && (
                    <div className="nav-mobile-user-summary">
                        <Avatar image={session.user?.image} name={session.user?.name} size="lg" />
                        <span>
                            <strong>{session.user?.name || 'ผู้ใช้'}</strong>
                            <small>{session.user?.email}</small>
                        </span>
                    </div>
                )}

                <nav className="nav-mobile-link-group nav-mobile-link-group--primary" aria-label="ลิงก์หลัก">
                    {NAV_LINKS.map(({ href, label }, index) => (
                        <Link
                            key={href}
                            href={href}
                            onClick={onClose}
                            className={`nav-mobile-link nav-mobile-link--primary${isActive(href) ? ' nav-mobile-link--active' : ''}`}
                        >
                            <span className="nav-mobile-link-index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                            {label}
                        </Link>
                    ))}
                </nav>

                {session ? (
                    <>
                        <div className="nav-mobile-divider" />
                        <nav className="nav-mobile-link-group" aria-label="เมนูผู้ใช้">
                            {USER_MENU_LINKS.map(({ href, label, icon: Icon }) => (
                                <Link
                                    key={href}
                                    href={href}
                                    onClick={onClose}
                                    className={`nav-mobile-link${isActive(href) ? ' nav-mobile-link--active' : ''}`}
                                >
                                    <Icon className="w-5 h-5" />
                                    {label}
                                </Link>
                            ))}
                            {isAdmin && (
                                <Link href="/admin" onClick={onClose} className="nav-mobile-link nav-mobile-link--admin">
                                    <ShieldIcon className="w-5 h-5" />
                                    Admin Panel
                                </Link>
                            )}
                        </nav>
                        <div className="nav-mobile-divider" />
                        <button type="button" onClick={onLogout} className="nav-mobile-link nav-mobile-action nav-mobile-action--danger">
                            <LogoutIcon className="w-5 h-5" />
                            ออกจากระบบ
                        </button>
                    </>
                ) : (
                    <div className="nav-mobile-auth-actions">
                        <Link href="/login" onClick={onClose} className="nav-mobile-auth nav-mobile-auth--secondary">
                            <LoginIcon className="w-5 h-5" />
                            เข้าสู่ระบบ
                        </Link>
                        <Link href="/register" onClick={onClose} className="nav-mobile-auth nav-mobile-auth--primary">
                            <RegisterIcon className="w-5 h-5" />
                            สมัครเรียน
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}

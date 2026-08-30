'use client';

import type { Session } from 'next-auth';
import Link from 'next/link';
import { LogIn, LogOut, ShieldCheck, UserRoundPlus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { NAV_LINKS, UserAvatar, USER_MENU_LINKS } from './navigation-config';

interface MobileNavigationPanelProps {
    session: Session | null;
    isAdmin: boolean;
    isActive: (href: string) => boolean;
    onClose: () => void;
    onLogout: () => void;
}

export default function MobileNavigationPanel({
    session,
    isAdmin,
    isActive,
    onClose,
    onLogout,
}: MobileNavigationPanelProps) {
    return (
        <div className="flex flex-1 flex-col overflow-y-auto p-4" aria-label="เมนูหลัก">
            {session && (
                <div className="flex min-w-0 items-center gap-3 px-3 py-4">
                    <UserAvatar image={session.user?.image} name={session.user?.name} size="lg" />
                    <span className="min-w-0">
                        <strong className="block truncate">{session.user?.name || 'ผู้ใช้'}</strong>
                        <span className="block truncate text-sm">{session.user?.email}</span>
                    </span>
                </div>
            )}

            <nav className="flex flex-col gap-1 py-2" aria-label="ลิงก์หลัก">
                {NAV_LINKS.map(({ href, label, icon: Icon }) => (
                    <Button
                        key={href}
                        asChild
                        variant={isActive(href) ? 'secondary' : 'ghost'}
                        className="w-full justify-start"
                    >
                        <Link
                            href={href}
                            onClick={onClose}
                            aria-current={isActive(href) ? 'page' : undefined}
                        >
                            <Icon data-icon="inline-start" aria-hidden="true" />
                            {label}
                        </Link>
                    </Button>
                ))}
            </nav>

            {session ? (
                <>
                    <Separator />
                    <nav className="flex flex-col gap-1 py-2" aria-label="เมนูผู้ใช้">
                        {USER_MENU_LINKS.map(({ href, label, icon: Icon }) => (
                            <Button
                                key={href}
                                asChild
                                variant={isActive(href) ? 'secondary' : 'ghost'}
                                className="w-full justify-start"
                            >
                                <Link
                                    href={href}
                                    onClick={onClose}
                                    aria-current={isActive(href) ? 'page' : undefined}
                                >
                                    <Icon data-icon="inline-start" aria-hidden="true" />
                                    {label}
                                </Link>
                            </Button>
                        ))}
                        {isAdmin && (
                            <Button asChild variant="ghost" className="w-full justify-start">
                                <Link href="/admin" onClick={onClose}>
                                    <ShieldCheck data-icon="inline-start" aria-hidden="true" />
                                    Admin Panel
                                </Link>
                            </Button>
                        )}
                    </nav>
                    <Separator />
                    <Button
                        type="button"
                        variant="destructive"
                        className="mt-3 w-full"
                        onClick={onLogout}
                    >
                        <LogOut data-icon="inline-start" aria-hidden="true" />
                        ออกจากระบบ
                    </Button>
                </>
            ) : (
                <div className="grid gap-2 pt-4">
                    <Button asChild variant="outline">
                        <Link href="/login" onClick={onClose}>
                            <LogIn data-icon="inline-start" aria-hidden="true" />
                            เข้าสู่ระบบ
                        </Link>
                    </Button>
                    <Button asChild>
                        <Link href="/register" onClick={onClose}>
                            <UserRoundPlus data-icon="inline-start" aria-hidden="true" />
                            สมัครเรียน
                        </Link>
                    </Button>
                </div>
            )}
        </div>
    );
}

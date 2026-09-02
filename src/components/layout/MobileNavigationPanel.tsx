'use client';

import type { Session } from 'next-auth';
import Link from 'next/link';
import { LogIn, LogOut, ShieldCheck, UserRoundPlus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
    ADMIN_NAVIGATION,
    GUEST_NAVIGATION,
    getNavigationState,
} from '@/lib/navigation-model';
import { NAV_LINKS, UserAvatar, USER_MENU_LINKS } from './navigation-config';

interface MobileNavigationPanelProps {
    session: Session | null;
    sessionStatus: 'loading' | 'authenticated' | 'unauthenticated';
    isAdmin: boolean;
    pathname: string;
    onClose: () => void;
    onLogout: () => void;
}

export default function MobileNavigationPanel({
    session,
    sessionStatus,
    isAdmin,
    pathname,
    onClose,
    onLogout,
}: MobileNavigationPanelProps) {
    const hasMemberSession = sessionStatus === 'authenticated' && session;

    return (
        <div className="flex flex-1 flex-col overflow-y-auto p-4" aria-label="เมนูหลัก">
            {sessionStatus === 'loading' ? (
                <div className="flex items-center gap-3 px-3 py-4" aria-label="กำลังโหลดเมนูบัญชี">
                    <Skeleton className="size-12 rounded-full" />
                    <span className="grid flex-1 gap-2">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-3 w-40 max-w-full" />
                    </span>
                </div>
            ) : hasMemberSession ? (
                <div className="flex min-w-0 items-center gap-3 px-3 py-4">
                    <UserAvatar image={session.user?.image} name={session.user?.name} size="lg" />
                    <span className="min-w-0">
                        <strong className="block truncate">{session.user?.name || 'ผู้ใช้'}</strong>
                        <span className="block truncate text-sm">{session.user?.email}</span>
                    </span>
                </div>
            ) : null}

            <nav className="flex flex-col gap-1 py-2" aria-label="ลิงก์หลัก">
                {NAV_LINKS.map((destination) => {
                    const state = getNavigationState(pathname, destination);
                    const Icon = destination.icon;
                    return (
                        <Button key={destination.href} asChild variant={state.active ? 'secondary' : 'ghost'} className="w-full justify-start">
                            <Link href={destination.href} onClick={onClose} aria-current={state.ariaCurrent}>
                                <Icon data-icon="inline-start" aria-hidden="true" />
                                {destination.label}
                            </Link>
                        </Button>
                    );
                })}
            </nav>

            {hasMemberSession ? (
                <>
                    <Separator />
                    <nav className="flex flex-col gap-1 py-2" aria-label="เมนูผู้ใช้">
                        {USER_MENU_LINKS.map((destination) => {
                            const state = getNavigationState(pathname, destination);
                            const Icon = destination.icon;
                            return (
                                <Button key={destination.href} asChild variant={state.active ? 'secondary' : 'ghost'} className="w-full justify-start">
                                    <Link href={destination.href} onClick={onClose} aria-current={state.ariaCurrent}>
                                        <Icon data-icon="inline-start" aria-hidden="true" />
                                        {destination.label}
                                    </Link>
                                </Button>
                            );
                        })}
                        {isAdmin ? (() => {
                            const state = getNavigationState(pathname, ADMIN_NAVIGATION);
                            return (
                                <Button asChild variant={state.active ? 'secondary' : 'ghost'} className="w-full justify-start">
                                    <Link href={ADMIN_NAVIGATION.href} onClick={onClose} aria-current={state.ariaCurrent}>
                                        <ShieldCheck data-icon="inline-start" aria-hidden="true" />
                                        {ADMIN_NAVIGATION.label}
                                    </Link>
                                </Button>
                            );
                        })() : null}
                    </nav>
                    <Separator />
                    <Button type="button" variant="destructive" className="mt-3 w-full" onClick={onLogout}>
                        <LogOut data-icon="inline-start" aria-hidden="true" />
                        ออกจากระบบ
                    </Button>
                </>
            ) : sessionStatus === 'unauthenticated' ? (
                <div className="grid gap-2 pt-4">
                    <Button asChild variant="outline">
                        <Link href={GUEST_NAVIGATION[0].href} onClick={onClose}>
                            <LogIn data-icon="inline-start" aria-hidden="true" />
                            {GUEST_NAVIGATION[0].label}
                        </Link>
                    </Button>
                    <Button asChild>
                        <Link href={GUEST_NAVIGATION[1].href} onClick={onClose}>
                            <UserRoundPlus data-icon="inline-start" aria-hidden="true" />
                            {GUEST_NAVIGATION[1].label}
                        </Link>
                    </Button>
                </div>
            ) : null}
        </div>
    );
}

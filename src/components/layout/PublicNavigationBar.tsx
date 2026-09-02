'use client';

import { useRef, useState } from 'react';
import type { Session } from 'next-auth';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Menu, UserRoundPlus } from 'lucide-react';

import { useNotifications } from '@/components/notifications/NotificationProvider';
import { Button } from '@/components/ui/button';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { getNavigationState, LOGIN_NAVIGATION, REGISTER_NAVIGATION } from '@/lib/navigation-model';
import MobileNavigationPanel from './MobileNavigationPanel';
import { NAV_LINKS } from './navigation-config';
import SkipToMainContent from './SkipToMainContent';
import UserNavigationMenus from './UserNavigationMenus';

interface PublicNavigationBarProps {
    onRequestLogout: (returnFocus: HTMLElement | null) => void;
}

export default function PublicNavigationBar({ onRequestLogout }: PublicNavigationBarProps) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const sessionResult = useSession();
    const session = sessionResult?.data as Session | null;
    const status = sessionResult?.status ?? 'unauthenticated';
    const pathname = usePathname();
    const mobileMenuTriggerRef = useRef<HTMLButtonElement>(null);
    const {
        unreadCount,
        notifications,
        markAsRead,
        deleteRead,
        setNotificationsPanelOpen,
    } = useNotifications();

    const isAdmin = session?.user?.role === 'admin';

    const closeMobileMenu = () => setIsMenuOpen(false);
    const requestLogout = (returnFocus: HTMLElement | null) => {
        closeMobileMenu();
        setNotificationsPanelOpen(false);
        onRequestLogout(returnFocus);
    };

    return (
        <>
            <SkipToMainContent />
            <nav
                className="sticky top-0 z-50 border-b border-border/70 bg-background/95 text-foreground shadow-sm backdrop-blur-xl"
                aria-label="เมนูหลัก"
                data-surface="public"
            >
                <div className="mx-auto flex h-18 w-full max-w-7xl items-center gap-6 px-4 sm:px-6 lg:px-8">
                    <Link
                        href="/"
                        className="group flex shrink-0 items-center gap-2.5 rounded-xl outline-none focus-visible:ring-4 focus-visible:ring-ring/30"
                        aria-label="MilerDev หน้าแรก"
                        aria-current={pathname === '/' ? 'page' : undefined}
                    >
                        <Image
                            src="/milerdev-logo-transparent.png"
                            alt=""
                            width={36}
                            height={36}
                            className="size-9 object-contain"
                            priority
                        />
                        <span
                            className="font-heading text-xl font-bold tracking-tight transition-colors group-hover:text-primary motion-reduce:transition-none"
                            translate="no"
                        >
                            MilerDev
                        </span>
                    </Link>

                    <div className="hidden flex-1 items-center justify-center gap-1 lg:flex">
                        {NAV_LINKS.map((destination) => {
                            const state = getNavigationState(pathname, destination);
                            return (
                                <Button key={destination.href} asChild variant="navigation" size="sm">
                                    <Link href={destination.href} aria-current={state.ariaCurrent}>
                                        {destination.label}
                                    </Link>
                                </Button>
                            );
                        })}
                    </div>

                    <div className="ml-auto hidden items-center gap-2 lg:flex">
                        {status === 'loading' ? (
                            <Skeleton className="size-10 rounded-full" aria-label="กำลังโหลดข้อมูลผู้ใช้" />
                        ) : session ? (
                            <UserNavigationMenus
                                session={session}
                                isAdmin={isAdmin}
                                pathname={pathname}
                                unreadCount={unreadCount}
                                notifications={notifications}
                                onMarkAsRead={markAsRead}
                                onDeleteRead={deleteRead}
                                onLogout={requestLogout}
                                onNotificationsOpenChange={setNotificationsPanelOpen}
                            />
                        ) : (
                            <>
                                <Button asChild variant="ghost">
                                    <Link href={LOGIN_NAVIGATION.href}>{LOGIN_NAVIGATION.label}</Link>
                                </Button>
                                <Button asChild>
                                    <Link href={REGISTER_NAVIGATION.href}>
                                        <UserRoundPlus data-icon="inline-start" aria-hidden="true" />
                                        {REGISTER_NAVIGATION.label}
                                    </Link>
                                </Button>
                            </>
                        )}
                    </div>

                    <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                        <SheetTrigger asChild>
                            <Button
                                ref={mobileMenuTriggerRef}
                                type="button"
                                variant="outline"
                                size="icon"
                                className="ml-auto lg:hidden"
                                aria-label="เปิดเมนูหลัก"
                            >
                                <Menu data-icon="inline-start" aria-hidden="true" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent
                            side="right"
                            className="w-[min(92vw,25rem)] p-0 sm:max-w-[25rem]"
                            onCloseAutoFocus={(event) => {
                                event.preventDefault();
                                mobileMenuTriggerRef.current?.focus();
                            }}
                        >
                            <SheetHeader className="border-b px-6 py-5">
                                <SheetTitle className="flex items-center gap-2.5 text-left">
                                    <Image
                                        src="/milerdev-logo-transparent.png"
                                        alt=""
                                        width={32}
                                        height={32}
                                        className="size-8 object-contain"
                                    />
                                    <span>MilerDev</span>
                                </SheetTitle>
                                <SheetDescription className="text-left">
                                    เลือกหน้าที่ต้องการ หรือเข้าสู่พื้นที่เรียนของคุณ
                                </SheetDescription>
                            </SheetHeader>
                            <MobileNavigationPanel
                                session={session}
                                sessionStatus={status}
                                isAdmin={isAdmin}
                                pathname={pathname}
                                unreadCount={unreadCount}
                                onClose={closeMobileMenu}
                                onLogout={() => requestLogout(mobileMenuTriggerRef.current)}
                            />
                        </SheetContent>
                    </Sheet>
                </div>
            </nav>
        </>
    );
}

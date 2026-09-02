'use client';

import { useEffect, useRef, useState } from 'react';
import type { Session } from 'next-auth';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import {
    Bell,
    ChevronDown,
    CircleAlert,
    CircleCheck,
    Info,
    LogOut,
    ShieldCheck,
    TriangleAlert,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from '@/components/ui/empty';
import {
    Popover,
    PopoverContent,
    PopoverHeader,
    PopoverTitle,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { ADMIN_NAVIGATION, getNavigationState } from '@/lib/navigation-model';
import { ACCOUNT_MENU_LINKS, MEMBER_UTILITY_LINKS, UserAvatar } from './navigation-config';

const notificationTypeIcons: Record<string, LucideIcon> = {
    info: Info,
    success: CircleCheck,
    warning: TriangleAlert,
    error: CircleAlert,
};

export interface NavbarNotification {
    id: string;
    title: string;
    message: string | null;
    type: string;
    link: string | null;
    isRead?: boolean;
    createdAt: string | Date;
}

interface UserNavigationMenusProps {
    session: Session;
    isAdmin: boolean;
    pathname: string;
    unreadCount: number;
    notifications: NavbarNotification[];
    onMarkAsRead: (ids?: string[]) => Promise<void>;
    onDeleteRead: () => Promise<void>;
    onLogout: (returnFocus: HTMLElement | null) => void;
    onNotificationsOpenChange: (open: boolean) => void;
}

export default function UserNavigationMenus({
    session,
    isAdmin,
    pathname,
    unreadCount,
    notifications,
    onMarkAsRead,
    onDeleteRead,
    onLogout,
    onNotificationsOpenChange,
}: UserNavigationMenusProps) {
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const userTriggerRef = useRef<HTMLButtonElement>(null);
    const adminState = getNavigationState(pathname, ADMIN_NAVIGATION);

    useEffect(() => {
        return () => onNotificationsOpenChange(false);
    }, [onNotificationsOpenChange]);

    const setNotificationPanel = (open: boolean) => {
        setNotificationsOpen(open);
        onNotificationsOpenChange(open);
    };

    const selectNotification = (notification: NavbarNotification) => {
        if (!notification.isRead) {
            void onMarkAsRead([notification.id]);
        }
        setNotificationPanel(false);
    };

    return (
        <div className="flex items-center gap-1">
            <Popover open={notificationsOpen} onOpenChange={setNotificationPanel}>
                <PopoverTrigger asChild>
                    <Button
                        type="button"
                        variant="navigation"
                        size="icon"
                        className="relative"
                        aria-label="การแจ้งเตือน"
                    >
                        <Bell data-icon="inline-start" aria-hidden="true" />
                        {unreadCount > 0 && (
                            <Badge
                                variant="destructive"
                                className="absolute -top-1 -right-1 min-w-5 justify-center px-1"
                            >
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </Badge>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent
                    align="end"
                    sideOffset={10}
                    className="w-[min(24rem,calc(100vw-2rem))] gap-0 overflow-hidden p-0"
                    aria-label="การแจ้งเตือน"
                >
                    <PopoverHeader className="flex-row items-center justify-between gap-3 px-4 py-3">
                        <PopoverTitle>
                            การแจ้งเตือน{unreadCount > 0 ? ` (${unreadCount})` : ''}
                        </PopoverTitle>
                        {unreadCount > 0 && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => void onMarkAsRead()}
                            >
                                อ่านทั้งหมด
                            </Button>
                        )}
                    </PopoverHeader>
                    <Separator />

                    <div className="max-h-90 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <Empty className="p-8">
                                <EmptyHeader>
                                    <EmptyMedia variant="icon">
                                        <Bell aria-hidden="true" />
                                    </EmptyMedia>
                                    <EmptyTitle>ไม่มีการแจ้งเตือน</EmptyTitle>
                                    <EmptyDescription>
                                        เมื่อมีข่าวสารหรือความคืบหน้า ระบบจะแสดงไว้ที่นี่
                                    </EmptyDescription>
                                </EmptyHeader>
                            </Empty>
                        ) : (
                            notifications.slice(0, 10).map((notification) => {
                                const NotificationIcon = notificationTypeIcons[notification.type] ?? Info;
                                const content = (
                                    <>
                                        <NotificationIcon data-icon="inline-start" aria-hidden="true" />
                                        <span className="flex min-w-0 flex-1 flex-col items-start gap-1">
                                            <strong className="max-w-full truncate">{notification.title}</strong>
                                            {notification.message && (
                                                <span className="max-w-full truncate text-xs">
                                                    {notification.message}
                                                </span>
                                            )}
                                            <time className="text-xs" dateTime={new Date(notification.createdAt).toISOString()}>
                                                {new Date(notification.createdAt).toLocaleDateString('th-TH', {
                                                    day: 'numeric',
                                                    month: 'short',
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })}
                                            </time>
                                        </span>
                                        {!notification.isRead && <Badge>ใหม่</Badge>}
                                    </>
                                );
                                const buttonProps = {
                                    variant: notification.isRead ? 'ghost' as const : 'secondary' as const,
                                    className: 'h-auto w-full justify-start rounded-none px-4 py-3 text-left whitespace-normal',
                                };

                                return notification.link ? (
                                    <Button key={notification.id} asChild {...buttonProps}>
                                        <Link
                                            href={notification.link}
                                            onClick={() => selectNotification(notification)}
                                        >
                                            {content}
                                        </Link>
                                    </Button>
                                ) : (
                                    <Button
                                        key={notification.id}
                                        type="button"
                                        {...buttonProps}
                                        onClick={() => selectNotification(notification)}
                                    >
                                        {content}
                                    </Button>
                                );
                            })
                        )}
                    </div>

                    {notifications.some((notification) => notification.isRead) && (
                        <>
                            <Separator />
                            <div className="flex justify-end p-3">
                                <Button
                                    type="button"
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => void onDeleteRead()}
                                >
                                    ลบที่อ่านแล้ว
                                </Button>
                            </div>
                        </>
                    )}
                </PopoverContent>
            </Popover>

            <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                    <Button
                        ref={userTriggerRef}
                        type="button"
                        variant="navigation"
                        size="navigation"
                        aria-label={`เมนูผู้ใช้ ${session.user?.name || 'ผู้ใช้'}`}
                    >
                        <UserAvatar image={session.user?.image} name={session.user?.name} />
                        <span className="flex transition-transform duration-150 group-data-[state=open]/button:rotate-180 motion-reduce:transition-none">
                            <ChevronDown data-icon="inline-end" aria-hidden="true" />
                        </span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" sideOffset={10} className="w-72">
                    <DropdownMenuGroup>
                        <DropdownMenuLabel variant="account">
                            <div className="flex min-w-0 items-center gap-3">
                                <UserAvatar image={session.user?.image} name={session.user?.name} size="lg" />
                                <span className="min-w-0">
                                    <strong className="block truncate text-sm font-semibold text-popover-foreground">
                                        {session.user?.name || 'ผู้ใช้'}
                                    </strong>
                                    {session.user?.email && (
                                        <span className="block truncate text-xs font-normal text-muted-foreground">
                                            {session.user.email}
                                        </span>
                                    )}
                                </span>
                            </div>
                        </DropdownMenuLabel>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                        {ACCOUNT_MENU_LINKS.map((destination) => {
                            const state = getNavigationState(pathname, destination);
                            const Icon = destination.icon;
                            return (
                                <DropdownMenuItem key={destination.href} variant="navigation" asChild>
                                    <Link href={destination.href} aria-current={state.ariaCurrent}>
                                        <Icon aria-hidden="true" />
                                        {destination.label}
                                    </Link>
                                </DropdownMenuItem>
                            );
                        })}
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                        {MEMBER_UTILITY_LINKS.map((destination) => {
                            const state = getNavigationState(pathname, destination);
                            const Icon = destination.icon;
                            return (
                                <DropdownMenuItem key={destination.href} variant="navigation" asChild>
                                    <Link href={destination.href} aria-current={state.ariaCurrent}>
                                        <Icon aria-hidden="true" />
                                        {destination.label}
                                    </Link>
                                </DropdownMenuItem>
                            );
                        })}
                        {isAdmin && (
                            <DropdownMenuItem variant="navigation" asChild>
                                <Link
                                    href={ADMIN_NAVIGATION.href}
                                    aria-current={adminState.ariaCurrent}
                                >
                                    <ShieldCheck aria-hidden="true" />
                                    {ADMIN_NAVIGATION.label}
                                </Link>
                            </DropdownMenuItem>
                        )}
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                        <DropdownMenuItem
                            variant="destructive"
                            className="min-h-11 gap-3"
                            onSelect={() => onLogout(userTriggerRef.current)}
                        >
                            <LogOut aria-hidden="true" />
                            ออกจากระบบ
                        </DropdownMenuItem>
                    </DropdownMenuGroup>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}

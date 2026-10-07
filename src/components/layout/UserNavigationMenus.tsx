'use client';

import { useRef } from 'react';
import type { Session } from 'next-auth';
import Link from 'next/link';
import { ChevronDown, LogOut, ShieldCheck } from 'lucide-react';

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
import { ADMIN_NAVIGATION, getNavigationState } from '@/lib/navigation-model';
import { ACCOUNT_MENU_LINKS, UserAvatar } from './navigation-config';

interface UserNavigationMenusProps {
    session: Session;
    isAdmin: boolean;
    pathname: string;
    onLogout: (returnFocus: HTMLElement | null) => void;
}

export default function UserNavigationMenus({
    session,
    isAdmin,
    pathname,
    onLogout,
}: UserNavigationMenusProps) {
    const userTriggerRef = useRef<HTMLButtonElement>(null);
    const adminState = getNavigationState(pathname, ADMIN_NAVIGATION);

    return (
        <div className="flex items-center gap-1">
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
                                        <span className="block truncate text-caption font-normal text-muted-foreground">
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
                    {isAdmin && (
                        <>
                            <DropdownMenuSeparator />
                            <DropdownMenuGroup>
                                <DropdownMenuItem variant="navigation" asChild>
                                    <Link
                                        href={ADMIN_NAVIGATION.href}
                                        aria-current={adminState.ariaCurrent}
                                    >
                                        <ShieldCheck aria-hidden="true" />
                                        {ADMIN_NAVIGATION.label}
                                    </Link>
                                </DropdownMenuItem>
                            </DropdownMenuGroup>
                        </>
                    )}
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

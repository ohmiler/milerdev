import type { LucideIcon } from 'lucide-react';
import {
    BookOpen,
    House,
    Info,
    Mail,
    Megaphone,
    PenLine,
    Settings,
    User,
} from 'lucide-react';

import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from '@/components/ui/avatar';

export type NavigationIcon = LucideIcon;

export const NAV_LINKS = [
    { href: '/courses', label: 'คอร์สทั้งหมด', icon: BookOpen },
    { href: '/blog', label: 'บทความ', icon: PenLine },
    { href: '/about', label: 'เกี่ยวกับเรา', icon: Info },
    { href: '/contact', label: 'ติดต่อ', icon: Mail },
] as const;

export const USER_MENU_LINKS = [
    { href: '/dashboard', label: 'แดชบอร์ด', icon: House },
    { href: '/announcements', label: 'ประกาศ', icon: Megaphone },
    { href: '/profile', label: 'โปรไฟล์', icon: User },
    { href: '/settings', label: 'ตั้งค่า', icon: Settings },
] as const;

export function UserAvatar({
    image,
    name,
    size = 'default',
}: {
    image?: string | null;
    name?: string | null;
    size?: 'sm' | 'default' | 'lg';
}) {
    const fallback = name?.trim().charAt(0).toUpperCase() || 'U';

    return (
        <Avatar size={size} variant="brand">
            {image && <AvatarImage src={image} alt={name || 'รูปโปรไฟล์ผู้ใช้'} />}
            <AvatarFallback aria-hidden>{fallback}</AvatarFallback>
        </Avatar>
    );
}

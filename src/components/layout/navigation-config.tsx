import Image from 'next/image';
import type { ComponentType } from 'react';
import {
    BookIcon,
    HomeIcon,
    InfoIcon,
    MailIcon,
    MegaphoneIcon,
    PenIcon,
    SettingsIcon,
    UserIcon,
} from '@/components/ui/Icons';

export type NavigationIcon = ComponentType<{ className?: string }>;

export const NAV_LINKS = [
    { href: '/courses', label: 'คอร์สทั้งหมด', icon: BookIcon },
    { href: '/blog', label: 'บทความ', icon: PenIcon },
    { href: '/about', label: 'เกี่ยวกับเรา', icon: InfoIcon },
    { href: '/contact', label: 'ติดต่อ', icon: MailIcon },
] as const;

export const USER_MENU_LINKS = [
    { href: '/dashboard', label: 'แดชบอร์ด', icon: HomeIcon },
    { href: '/announcements', label: 'ประกาศ', icon: MegaphoneIcon },
    { href: '/profile', label: 'โปรไฟล์', icon: UserIcon },
    { href: '/settings', label: 'ตั้งค่า', icon: SettingsIcon },
] as const;

export function Avatar({
    image,
    name,
    size = 'md',
}: {
    image?: string | null;
    name?: string | null;
    size?: 'sm' | 'md' | 'lg';
}) {
    const sizeMap = { sm: 32, md: 36, lg: 44 };
    const px = sizeMap[size];

    if (image) {
        return (
            <Image
                src={image}
                alt={name || 'Avatar'}
                width={px}
                height={px}
                style={{ width: px, height: px, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--line)' }}
            />
        );
    }

    return (
        <span className="nav-avatar-fallback" style={{ width: px, height: px }} aria-hidden="true">
            {name?.charAt(0).toUpperCase() || 'U'}
        </span>
    );
}

export function ShieldIcon({ className = 'w-5 h-5' }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
    );
}

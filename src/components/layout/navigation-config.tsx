import type { LucideIcon } from 'lucide-react';
import {
    Award,
    BookOpen,
    CreditCard,
    House,
    Info,
    Mail,
    Settings,
    User,
} from 'lucide-react';

import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from '@/components/ui/avatar';
import {
    ACCOUNT_NAVIGATION,
    PUBLIC_NAVIGATION,
} from '@/lib/navigation-model';

export type NavigationIcon = LucideIcon;

const publicIcons: Record<(typeof PUBLIC_NAVIGATION)[number]['key'], LucideIcon> = {
    courses: BookOpen,
    about: Info,
    contact: Mail,
};

const accountIcons: Record<(typeof ACCOUNT_NAVIGATION)[number]['key'], LucideIcon> = {
    dashboard: House,
    payments: CreditCard,
    certificates: Award,
    profile: User,
    settings: Settings,
};

export const NAV_LINKS = PUBLIC_NAVIGATION.map((destination) => ({
    ...destination,
    icon: publicIcons[destination.key],
}));

export const ACCOUNT_MENU_LINKS = ACCOUNT_NAVIGATION.map((destination) => ({
    ...destination,
    icon: accountIcons[destination.key],
}));


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

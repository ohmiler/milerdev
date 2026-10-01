import { Metadata } from 'next';

import { DEFAULT_OG_IMAGE } from '@/lib/content/seo';

export const metadata: Metadata = {
    title: 'ประกาศ',
    description: 'ข่าวสารและประกาศล่าสุดจากทีมงาน MilerDev',
    robots: { index: false, follow: true },
    alternates: {
        canonical: '/announcements',
    },
    openGraph: {
        title: 'ประกาศ',
        description: 'ข่าวสารและประกาศล่าสุดจากทีมงาน MilerDev',
        url: '/announcements',
        siteName: 'MilerDev',
        images: [DEFAULT_OG_IMAGE],
    },
    twitter: {
        card: 'summary',
        title: 'ประกาศ - MilerDev',
        description: 'ข่าวสารและประกาศล่าสุดจากทีมงาน MilerDev',
        images: [DEFAULT_OG_IMAGE.url],
    },
};

export default function AnnouncementsLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}

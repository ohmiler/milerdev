import { Metadata } from 'next';

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
    },
    twitter: {
        card: 'summary',
        title: 'ประกาศ - MilerDev',
        description: 'ข่าวสารและประกาศล่าสุดจากทีมงาน MilerDev',
    },
};

export default function AnnouncementsLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}

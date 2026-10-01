import { Metadata } from 'next';

import { DEFAULT_OG_IMAGE } from '@/lib/content/seo';

export const metadata: Metadata = {
    title: 'ติดต่อเรา',
    description: 'ติดต่อทีมงาน MilerDev สำหรับคำถาม ข้อเสนอแนะ หรือความร่วมมือทางธุรกิจ',
    alternates: {
        canonical: '/contact',
    },
    openGraph: {
        title: 'ติดต่อเรา',
        description: 'ติดต่อทีมงาน MilerDev สำหรับคำถาม ข้อเสนอแนะ หรือความร่วมมือทางธุรกิจ',
        url: '/contact',
        siteName: 'MilerDev',
        images: [DEFAULT_OG_IMAGE],
    },
    twitter: {
        card: 'summary',
        title: 'ติดต่อเรา - MilerDev',
        description: 'ติดต่อทีมงาน MilerDev สำหรับคำถาม ข้อเสนอแนะ หรือความร่วมมือทางธุรกิจ',
        images: [DEFAULT_OG_IMAGE.url],
    },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}

import { Metadata } from 'next';

import { DEFAULT_OG_IMAGE } from '@/lib/content/seo';

export const metadata: Metadata = {
    title: 'นโยบายความเป็นส่วนตัว',
    description: 'นโยบายความเป็นส่วนตัวของ MilerDev การเก็บรวบรวมและใช้ข้อมูลส่วนบุคคล',
    alternates: {
        canonical: '/privacy',
    },
    openGraph: {
        title: 'นโยบายความเป็นส่วนตัว',
        description: 'นโยบายความเป็นส่วนตัวของ MilerDev การเก็บรวบรวมและใช้ข้อมูลส่วนบุคคล',
        url: '/privacy',
        siteName: 'MilerDev',
        images: [DEFAULT_OG_IMAGE],
    },
    twitter: {
        card: 'summary',
        title: 'นโยบายความเป็นส่วนตัว - MilerDev',
        description: 'นโยบายความเป็นส่วนตัวของ MilerDev การเก็บรวบรวมและใช้ข้อมูลส่วนบุคคล',
        images: [DEFAULT_OG_IMAGE.url],
    },
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}

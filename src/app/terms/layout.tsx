import { Metadata } from 'next';

import { DEFAULT_OG_IMAGE } from '@/lib/content/seo';

export const metadata: Metadata = {
    title: 'ข้อกำหนดการใช้งาน',
    description: 'ข้อกำหนดและเงื่อนไขการใช้งานแพลตฟอร์ม MilerDev',
    alternates: {
        canonical: '/terms',
    },
    openGraph: {
        title: 'ข้อกำหนดการใช้งาน',
        description: 'ข้อกำหนดและเงื่อนไขการใช้งานแพลตฟอร์ม MilerDev',
        url: '/terms',
        siteName: 'MilerDev',
        images: [DEFAULT_OG_IMAGE],
    },
    twitter: {
        card: 'summary',
        title: 'ข้อกำหนดการใช้งาน - MilerDev',
        description: 'ข้อกำหนดและเงื่อนไขการใช้งานแพลตฟอร์ม MilerDev',
        images: [DEFAULT_OG_IMAGE.url],
    },
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}

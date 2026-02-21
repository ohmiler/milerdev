import { Metadata } from 'next';

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
    },
    twitter: {
        card: 'summary',
        title: 'นโยบายความเป็นส่วนตัว - MilerDev',
        description: 'นโยบายความเป็นส่วนตัวของ MilerDev การเก็บรวบรวมและใช้ข้อมูลส่วนบุคคล',
    },
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}

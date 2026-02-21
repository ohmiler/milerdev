import { Metadata } from 'next';

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
    },
    twitter: {
        card: 'summary',
        title: 'ข้อกำหนดการใช้งาน - MilerDev',
        description: 'ข้อกำหนดและเงื่อนไขการใช้งานแพลตฟอร์ม MilerDev',
    },
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}

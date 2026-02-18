import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'คำถามที่พบบ่อย',
    description: 'คำถามและคำตอบที่พบบ่อยเกี่ยวกับ MilerDev แพลตฟอร์มเรียนเขียนโปรแกรมออนไลน์',
    alternates: {
        canonical: 'https://milerdev.com/faq',
    },
    openGraph: {
        title: 'คำถามที่พบบ่อย',
        description: 'คำถามและคำตอบที่พบบ่อยเกี่ยวกับ MilerDev แพลตฟอร์มเรียนเขียนโปรแกรมออนไลน์',
        url: '/faq',
        siteName: 'MilerDev',
    },
    twitter: {
        card: 'summary',
        title: 'คำถามที่พบบ่อย - MilerDev',
        description: 'คำถามและคำตอบที่พบบ่อยเกี่ยวกับ MilerDev แพลตฟอร์มเรียนเขียนโปรแกรมออนไลน์',
    },
};

export default function FaqLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}

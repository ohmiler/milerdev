import { Metadata } from 'next';

import { DEFAULT_OG_IMAGE } from '@/lib/content/seo';

export const metadata: Metadata = {
    title: 'คำถามที่พบบ่อยเกี่ยวกับคอร์สออนไลน์',
    description: 'คำตอบเรื่องการเริ่มเรียน คอร์สเขียนโปรแกรม การชำระเงิน บัญชี บททดลอง และใบรับรองของ MilerDev พร้อมช่องทางติดต่อทีมเมื่อยังไม่พบคำตอบที่ต้องการ',
    alternates: {
        canonical: '/faq',
    },
    openGraph: {
        title: 'คำถามที่พบบ่อยเกี่ยวกับคอร์สออนไลน์',
        description: 'คำตอบเรื่องการเริ่มเรียน คอร์สเขียนโปรแกรม การชำระเงิน บัญชี บททดลอง และใบรับรองของ MilerDev',
        url: '/faq',
        siteName: 'MilerDev',
        images: [DEFAULT_OG_IMAGE],
    },
    twitter: {
        card: 'summary',
        title: 'คำถามที่พบบ่อยเกี่ยวกับคอร์สออนไลน์ | MilerDev',
        description: 'คำตอบเรื่องการเริ่มเรียน คอร์สเขียนโปรแกรม การชำระเงิน บัญชี บททดลอง และใบรับรองของ MilerDev',
        images: [DEFAULT_OG_IMAGE.url],
    },
};

export default function FaqLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}

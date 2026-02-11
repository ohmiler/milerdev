import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'ติดต่อเรา',
    description: 'ติดต่อทีมงาน MilerDev สำหรับคำถาม ข้อเสนอแนะ หรือความร่วมมือทางธุรกิจ',
    openGraph: {
        title: 'ติดต่อเรา',
        description: 'ติดต่อทีมงาน MilerDev สำหรับคำถาม ข้อเสนอแนะ หรือความร่วมมือทางธุรกิจ',
        url: '/contact',
        siteName: 'MilerDev',
    },
    twitter: {
        card: 'summary',
        title: 'ติดต่อเรา - MilerDev',
        description: 'ติดต่อทีมงาน MilerDev สำหรับคำถาม ข้อเสนอแนะ หรือความร่วมมือทางธุรกิจ',
    },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}

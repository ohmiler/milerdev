import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'คลังความรู้',
    description: 'รวมเอกสาร บทความสั้น และคู่มือการเขียนโปรแกรม สำหรับทบทวนความรู้และใช้เป็นแหล่งอ้างอิง จาก MilerDev',
    keywords: ['คลังความรู้', 'เอกสาร', 'คู่มือเขียนโปรแกรม', 'MilerDev', 'programming', 'web development', 'knowledge base'],
    alternates: {
        canonical: '/docs',
    },
    openGraph: {
        title: 'คลังความรู้ - MilerDev',
        description: 'รวมเอกสาร บทความสั้น และคู่มือการเขียนโปรแกรม สำหรับทบทวนความรู้และใช้เป็นแหล่งอ้างอิง จาก MilerDev',
        url: '/docs',
        siteName: 'MilerDev',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'คลังความรู้ - MilerDev',
        description: 'รวมเอกสาร บทความสั้น และคู่มือการเขียนโปรแกรม สำหรับทบทวนความรู้และใช้เป็นแหล่งอ้างอิง จาก MilerDev',
    },
};

export default function DocsLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}

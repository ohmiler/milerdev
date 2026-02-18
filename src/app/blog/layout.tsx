import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'บทความ',
    description: 'บทความเกี่ยวกับการเขียนโปรแกรม เทคโนโลยี และเคล็ดลับสำหรับนักพัฒนา จาก MilerDev',
    alternates: {
        canonical: 'https://milerdev.com/blog',
    },
    openGraph: {
        title: 'บทความ',
        description: 'บทความเกี่ยวกับการเขียนโปรแกรม เทคโนโลยี และเคล็ดลับสำหรับนักพัฒนา จาก MilerDev',
        url: '/blog',
        siteName: 'MilerDev',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'บทความ - MilerDev',
        description: 'บทความเกี่ยวกับการเขียนโปรแกรม เทคโนโลยี และเคล็ดลับสำหรับนักพัฒนา จาก MilerDev',
    },
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}

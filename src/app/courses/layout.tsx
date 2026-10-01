import { Metadata } from 'next';

import { DEFAULT_OG_IMAGE } from '@/lib/content/seo';

export const metadata: Metadata = {
    title: 'คอร์สเขียนโปรแกรมออนไลน์ภาษาไทย',
    description: 'เลือกคอร์สเขียนโปรแกรมออนไลน์ภาษาไทย เปรียบเทียบเนื้อหา ราคา เวลาเรียน ผู้สอน และบททดลองฟรี ครอบคลุม HTML CSS JavaScript React และ Web Development',
    alternates: {
        canonical: '/courses',
    },
    openGraph: {
        title: 'คอร์สเขียนโปรแกรมออนไลน์ภาษาไทย',
        description: 'เลือกคอร์สเขียนโปรแกรมออนไลน์ภาษาไทย เปรียบเทียบเนื้อหา ราคา เวลาเรียน ผู้สอน และบททดลองฟรี ก่อนตัดสินใจสมัครกับ MilerDev',
        url: '/courses',
        siteName: 'MilerDev',
        images: [DEFAULT_OG_IMAGE],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'คอร์สเขียนโปรแกรมออนไลน์ภาษาไทย | MilerDev',
        description: 'เลือกคอร์สเขียนโปรแกรมออนไลน์ภาษาไทย เปรียบเทียบเนื้อหา ราคา เวลาเรียน ผู้สอน และบททดลองฟรี ก่อนตัดสินใจสมัคร',
        images: [DEFAULT_OG_IMAGE.url],
    },
};

export default function CoursesLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}

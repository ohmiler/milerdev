import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'บทความเขียนโปรแกรมและ Web Development',
    description: 'อ่านบทความเขียนโปรแกรมภาษาไทย แนวคิด Web Development เครื่องมือ AI และบทเรียนจากงานจริง เพื่อเข้าใจพื้นฐาน เขียนโค้ดได้ดีขึ้น และพัฒนาต่ออย่างมั่นใจ',
    alternates: {
        canonical: '/blog',
    },
    openGraph: {
        title: 'บทความเขียนโปรแกรมและ Web Development',
        description: 'บทความภาษาไทยเรื่องการเขียนโปรแกรม Web Development เครื่องมือ AI และบทเรียนจากงานจริงสำหรับนักพัฒนา',
        url: '/blog',
        siteName: 'MilerDev',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'บทความเขียนโปรแกรมและ Web Development | MilerDev',
        description: 'บทความภาษาไทยเรื่องการเขียนโปรแกรม Web Development เครื่องมือ AI และบทเรียนจากงานจริงสำหรับนักพัฒนา',
    },
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}

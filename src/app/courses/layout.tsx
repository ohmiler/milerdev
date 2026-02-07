import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'คอร์สทั้งหมด',
    description: 'ค้นหาและเรียนรู้คอร์สเขียนโปรแกรมออนไลน์คุณภาพสูง ครอบคลุมทุกระดับตั้งแต่เริ่มต้นจนถึงขั้นสูง',
};

export default function CoursesLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}

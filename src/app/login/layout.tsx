import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'เข้าสู่ระบบ',
    description: 'เข้าสู่ระบบเพื่อเริ่มเรียนออนไลน์กับ MilerDev',
    robots: { index: false, follow: false },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}

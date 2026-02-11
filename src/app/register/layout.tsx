import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'สมัครสมาชิก',
    description: 'สมัครสมาชิกฟรีเพื่อเริ่มต้นเรียน Coding ออนไลน์กับ MilerDev',
    robots: { index: false, follow: false },
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}

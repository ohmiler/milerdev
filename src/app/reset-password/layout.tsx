import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'รีเซ็ตรหัสผ่าน',
    description: 'ตั้งรหัสผ่านใหม่ - MilerDev',
    robots: { index: false, follow: false },
};

export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}

import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'ลืมรหัสผ่าน',
    description: 'รีเซ็ตรหัสผ่านของคุณ - MilerDev',
    robots: { index: false, follow: false },
};

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}

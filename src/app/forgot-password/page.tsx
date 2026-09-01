import AuthShell from '@/components/auth/AuthShell';
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm';
import { createAuthReturnHref, resolveSafeAuthReturn } from '@/lib/safe-auth-return';

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string | string[] }>;
}) {
  const { callbackUrl } = await searchParams;
  const { pathname: returnTo } = resolveSafeAuthReturn(callbackUrl);
  const loginHref = createAuthReturnHref('/login', returnTo);

  return (
    <AuthShell
      pageId={'forgot-password'}
      variant={'recovery'}
      panelTitle={'ลืมรหัสผ่าน?'}
      panelDescription={'กรอกอีเมลของคุณ เราจะส่งลิงก์สำหรับตั้งรหัสผ่านใหม่'}
      contextTitle={<>กลับเข้าสู่บทเรียน<br />ด้วยขั้นตอนที่ชัดเจน</>}
      contextDescription={'ระบบจะตอบแบบเดียวกันไม่ว่าอีเมลจะมีในระบบหรือไม่ เพื่อช่วยปกป้องข้อมูลบัญชีของผู้เรียน'}
      evidence={[
        { label: 'ส่งคำขอ', text: 'ส่งคำขอด้วยอีเมลบัญชี' },
        { label: 'ตรวจอีเมล', text: 'ตรวจกล่องจดหมายและสแปม' },
        { label: 'ตั้งรหัสผ่าน', text: 'ใช้ลิงก์เพื่อตั้งรหัสผ่านใหม่' },
      ]}
    >
      <ForgotPasswordForm returnTo={returnTo} loginHref={loginHref} />
    </AuthShell>
  );
}

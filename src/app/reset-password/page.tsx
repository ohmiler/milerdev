import AuthShell from '@/components/auth/AuthShell';
import ResetPasswordForm from '@/components/auth/ResetPasswordForm';
import { createAuthReturnHref, resolveSafeAuthReturn } from '@/lib/safe-auth-return';

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{
    token?: string | string[];
    callbackUrl?: string | string[];
  }>;
}) {
  const { token, callbackUrl } = await searchParams;
  const opaqueToken = typeof token === 'string' && token.length > 0 ? token : null;
  const { pathname: returnTo } = resolveSafeAuthReturn(callbackUrl);
  const forgotPasswordHref = createAuthReturnHref('/forgot-password', returnTo);
  const loginHref = createAuthReturnHref('/login', returnTo);
  const successLoginHref = `${loginHref}&reason=password-reset`;

  return (
    <AuthShell
      pageId={'reset-password'}
      variant={'recovery'}
      panelTitle={'ตั้งรหัสผ่านใหม่'}
      panelDescription={'กำหนดรหัสผ่านใหม่สำหรับกลับเข้าใช้บัญชี MilerDev'}
      contextTitle={<>ตั้งค่าการเข้าถึงใหม่<br />แล้วกลับไปเรียนต่อ</>}
      contextDescription={'ลิงก์สำหรับตั้งรหัสผ่านมีอายุจำกัด และจะใช้งานไม่ได้หลังตั้งรหัสผ่านใหม่สำเร็จ'}
      evidence={[
        { label: 'ตรวจสอบลิงก์', text: 'ตรวจลิงก์กู้คืนบัญชี' },
        { label: 'รหัสผ่านใหม่', text: 'กำหนดรหัสผ่านตามเงื่อนไข' },
        { label: 'กลับเข้าสู่ระบบ', text: 'กลับไปเข้าสู่ระบบอีกครั้ง' },
      ]}
    >
      <ResetPasswordForm
        token={opaqueToken}
        forgotPasswordHref={forgotPasswordHref}
        loginHref={loginHref}
        successLoginHref={successLoginHref}
      />
    </AuthShell>
  );
}

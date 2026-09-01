import AuthShell from '@/components/auth/AuthShell';
import RegisterForm from '@/components/auth/RegisterForm';
import { createAuthReturnHref, resolveSafeAuthReturn } from '@/lib/safe-auth-return';

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string | string[] }>;
}) {
  const { callbackUrl } = await searchParams;
  const { pathname: returnTo } = resolveSafeAuthReturn(callbackUrl);
  const loginHref = createAuthReturnHref('/login', returnTo);

  return (
    <AuthShell
      pageId={'register'}
      variant={'register'}
      panelTitle={'สมัครสมาชิก'}
      panelDescription={'กรอกข้อมูลสำหรับบัญชีผู้เรียน หรือสมัครด้วย Google'}
    >
      <RegisterForm returnTo={returnTo} loginHref={loginHref} />
    </AuthShell>
  );
}

import type { Metadata } from 'next';
import AuthShell from '@/components/auth/AuthShell';
import VerifyEmailForm from '@/components/auth/VerifyEmailForm';
import { createAuthReturnHref } from '@/lib/safe-auth-return';

export const metadata: Metadata = {
  title: 'ยืนยันอีเมล', robots: { index: false, follow: false }, referrer: 'no-referrer',
};

export default async function VerifyEmailPage({ searchParams }: {
  searchParams: Promise<{ callbackUrl?: string | string[] }>;
}) {
  const { callbackUrl } = await searchParams;
  return <AuthShell pageId="verify-email" panelTitle="ยืนยันอีเมลและสร้างบัญชี" panelDescription="ตั้งชื่อและรหัสผ่านเพื่อสมัครสมาชิกให้เสร็จ">
    <VerifyEmailForm registerHref={createAuthReturnHref('/register', callbackUrl)} loginHref={createAuthReturnHref('/login', callbackUrl)} />
  </AuthShell>;
}

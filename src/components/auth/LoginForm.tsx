'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { FieldGroup } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import type { SafeAuthReturnPath } from '@/lib/safe-auth-return';
import { GoogleIcon } from './AuthIcons';
import { AuthDivider, AuthError, AuthField, AuthFootnote, PasswordInput } from './AuthFormLayout';

export const AUTH_ERROR_MESSAGES: Record<string, string> = {
  OAuthAccountNotLinked: 'อีเมลนี้มีบัญชีอยู่แล้ว กรุณาเข้าสู่ระบบด้วยรหัสผ่านก่อน แล้วจึงเชื่อมบัญชี Google ภายหลัง',
  AccessDenied: 'ไม่สามารถเข้าสู่ระบบได้ กรุณาลองใหม่อีกครั้ง',
  Configuration: 'ระบบเข้าสู่ระบบ Google ยังตั้งค่าไม่สมบูรณ์ กรุณาลองใหม่อีกครั้งภายหลัง',
  Verification: 'ลิงก์เข้าสู่ระบบไม่ถูกต้องหรือหมดอายุแล้ว',
  unauthorized: 'กรุณาเข้าสู่ระบบก่อนเข้าใช้งานหน้านี้',
};

export default function LoginForm({
  returnTo,
  registerHref,
}: {
  returnTo: SafeAuthReturnPath;
  registerHref: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const errorCode = searchParams.get('error');
    if (!errorCode) return;

    setError(AUTH_ERROR_MESSAGES[errorCode] || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ กรุณาลองใหม่อีกครั้ง');
  }, [searchParams]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
      } else {
        router.push(returnTo);
        router.refresh();
      }
    } catch {
      setError('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {error && <AuthError>{error}</AuthError>}

      <form onSubmit={handleSubmit} className="flex flex-col gap-5" aria-busy={loading}>
        <FieldGroup className="gap-5">
          <AuthField htmlFor="login-email" label="อีเมล">
            <Input
            id={'login-email'}
            name={'email'}
            type={'email'}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            autoComplete={'email'}
            placeholder={'name@example.com'}
            />
          </AuthField>

          <AuthField htmlFor="login-password" label="รหัสผ่าน" trailing={<Link className="text-xs font-semibold text-primary hover:underline" href="/forgot-password">ลืมรหัสผ่าน?</Link>}>
            <PasswordInput
              id={'login-password'}
              name={'password'}
              visible={showPassword}
              onVisibilityChange={() => setShowPassword((visible) => !visible)}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              autoComplete={'current-password'}
              placeholder={'••••••••'}
            />
          </AuthField>
        </FieldGroup>

        <Button type="submit" className="w-full" disabled={loading} aria-busy={loading}>
          {loading && <Spinner data-icon="inline-start" aria-hidden="true" />}
          {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
        </Button>
      </form>

      <AuthDivider>หรือใช้บัญชี Google</AuthDivider>

      <Button
        type="button"
        onClick={() => signIn('google', { callbackUrl: returnTo })}
        variant="outline"
        className="w-full"
      >
        <GoogleIcon />
        เข้าสู่ระบบด้วย Google
      </Button>

      <AuthFootnote>ยังไม่มีบัญชี? <Link href={registerHref}>สมัครสมาชิกฟรี</Link></AuthFootnote>
      <p className="mt-2 text-center text-xs leading-5 text-muted-foreground">การเข้าสู่ระบบจะใช้ข้อมูลบัญชีตามนโยบายความเป็นส่วนตัวของ MilerDev</p>
    </>
  );
}

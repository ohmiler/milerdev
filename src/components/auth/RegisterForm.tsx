'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getAuthPublicError } from '@/lib/auth-public-error';
import type { SafeAuthReturnPath } from '@/lib/safe-auth-return';
import { GoogleIcon } from './AuthIcons';
import { AuthDivider, AuthError, AuthField, AuthFootnote, RecoveryState } from './AuthFormLayout';

export default function RegisterForm({ returnTo, loginHref, forgotPasswordHref }: {
  returnTo: SafeAuthReturnPath; loginHref: string; forgotPasswordHref: string;
}) {
  const emailRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  async function requestVerification() {
    if (loading || cooldown > 0) return;
    setError('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setEmailError('กรุณากรอกอีเมลให้ถูกต้อง');
      emailRef.current?.focus();
      return;
    }
    setEmailError('');
    setLoading(true);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), callbackUrl: returnTo }),
      });
      const data = await response.json();
      if (!response.ok) { setError(getAuthPublicError(response.status, data)); return; }
      setSent(true);
      setCooldown(60);
    } catch { setError('เกิดข้อผิดพลาด กรุณาลองใหม่'); }
    finally { setLoading(false); }
  }

  if (sent) return <RecoveryState tone="success" title="ตรวจสอบคำขอแล้ว" actions={<>
    <Button onClick={requestVerification} disabled={loading || cooldown > 0}>
      {cooldown > 0 ? `ส่งอีเมลอีกครั้งได้ใน ${cooldown} วินาที` : 'ส่งอีเมลยืนยันอีกครั้ง'}
    </Button>
    <Button variant="outline" onClick={() => { setSent(false); setEmail(''); setError(''); setCooldown(0); }}>ใช้อีเมลอื่น</Button>
    <Button asChild variant="outline"><Link href={loginHref}>เข้าสู่ระบบ</Link></Button>
    <Button asChild variant="outline"><Link href={forgotPasswordHref}>ตั้งรหัสผ่านใหม่</Link></Button>
  </>}>
    <p>หากอีเมลนี้ยังไม่มีบัญชี เราจะส่งลิงก์ยืนยันให้คุณ โปรดตรวจกล่องจดหมายและสแปม</p>
    <p>เปิดลิงก์ภายใน 30 นาที แล้วตั้งชื่อและรหัสผ่านเพื่อสมัครให้เสร็จ หากมีบัญชีแล้ว ให้เข้าสู่ระบบหรือขอตั้งรหัสผ่านใหม่</p>
    <p>ส่งอีเมลยืนยันได้ไม่เกิน 3 ครั้งต่อชั่วโมง หากยังไม่ได้รับ ให้รอแล้วลองใหม่</p>
    {error && <AuthError live="polite">{error}</AuthError>}
  </RecoveryState>;

  return <>
    {error && <AuthError live="polite">{error}</AuthError>}
    <form noValidate aria-busy={loading} className="flex flex-col gap-5" onSubmit={(event) => { event.preventDefault(); void requestVerification(); }}>
      <AuthField htmlFor="register-email" label="อีเมล" invalid={!!emailError} error={emailError ? { id: 'register-email-error', message: emailError } : undefined}>
        <Input ref={emailRef} id="register-email" name="email" type="email" required maxLength={255} autoComplete="email" value={email} onChange={(event) => { setEmail(event.target.value); setEmailError(''); }} aria-invalid={!!emailError || undefined} aria-describedby={emailError ? 'register-email-error' : undefined} />
      </AuthField>
      <Button type="submit" disabled={loading}>{loading ? 'กำลังส่งคำขอ...' : 'ส่งลิงก์ยืนยันอีเมล'}</Button>
    </form>
    <AuthDivider>หรือใช้บัญชี Google</AuthDivider>
    <Button variant="outline" className="w-full" onClick={() => signIn('google', { callbackUrl: returnTo })}><GoogleIcon />สมัครสมาชิกด้วย Google</Button>
    <AuthFootnote>มีบัญชีอยู่แล้ว? <Link href={loginHref}>เข้าสู่ระบบ</Link></AuthFootnote>
    <p className="mt-2 text-center text-xs text-muted-foreground">อ่าน <Link href="/terms">ข้อกำหนดการใช้งาน</Link> และ <Link href="/privacy">นโยบายความเป็นส่วนตัว</Link> ก่อนสมัครสมาชิก</p>
  </>;
}

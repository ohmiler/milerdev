'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FieldGroup } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { getAuthPublicError } from '@/lib/auth-public-error';
import type { SafeAuthReturnPath } from '@/lib/safe-auth-return';
import { AuthError, AuthField, AuthFootnote, RecoveryState } from './AuthFormLayout';

export default function ForgotPasswordForm({
  returnTo,
  loginHref,
}: {
  returnTo: SafeAuthReturnPath;
  loginHref: string;
}) {
  const emailInputRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');

  useEffect(() => {
    if (!sent || cooldownSeconds <= 0) return;

    const timer = window.setTimeout(() => {
      setCooldownSeconds((seconds) => Math.max(0, seconds - 1));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [cooldownSeconds, sent]);

  const requestReset = async () => {
    setError('');

    const normalizedEmail = email.trim();
    const validationError = !normalizedEmail
      ? 'กรุณากรอกอีเมล'
      : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
        ? 'กรุณากรอกอีเมลให้ถูกต้อง'
        : '';

    if (validationError) {
      setEmailError(validationError);
      emailInputRef.current?.focus();
      return;
    }

    setEmail(normalizedEmail);
    setEmailError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, callbackUrl: returnTo }),
      });

      const data = await response.json();

      if (response.ok) {
        const retryAfterSeconds = Number(data.retryAfterSeconds);
        setCooldownSeconds(
          Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
            ? Math.ceil(retryAfterSeconds)
            : 0,
        );
        setSent(true);
      } else {
        setError(getAuthPublicError(response.status, data));
      }
    } catch {
      setError('เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await requestReset();
  };

  const resetForm = () => {
    setSent(false);
    setEmail('');
    setCooldownSeconds(0);
    setError('');
    setEmailError('');
  };

  const cooldownLabel = `${Math.floor(cooldownSeconds / 60)}:${String(cooldownSeconds % 60).padStart(2, '0')}`;

  if (sent) {
    return (
      <RecoveryState
        tone={'success'}
        title={'ตรวจสอบคำขอแล้ว'}
        actions={<>
          <Button asChild><Link href={loginHref}>เข้าสู่ระบบ</Link></Button>
          <Button type={'button'} variant={'outline'} onClick={resetForm}>ใช้อีเมลอื่น</Button>
          <Button
            type={'button'}
            variant={'outline'}
            disabled={loading || cooldownSeconds > 0}
            onClick={requestReset}
          >
            {loading
              ? 'กำลังส่ง...'
              : cooldownSeconds > 0
                ? `ส่งอีกครั้งใน ${cooldownLabel}`
                : 'ส่งอีกครั้ง'}
          </Button>
        </>}
      >
        <p>หากอีเมลเชื่อมกับบัญชีที่พร้อมใช้งาน ระบบจะส่งลิงก์สำหรับตั้งรหัสผ่านใหม่</p>
        <p>ตรวจสอบกล่องขาเข้าและโฟลเดอร์สแปม ลิงก์มีอายุ 1 ชั่วโมง</p>
      </RecoveryState>
    );
  }

  return (
    <>
      {error && <AuthError live={'polite'}>{error}</AuthError>}
      <form onSubmit={handleSubmit} className="flex flex-col gap-5" aria-busy={loading} noValidate>
        <FieldGroup className="gap-5">
          <AuthField
            htmlFor={'forgot-email'}
            label={'อีเมล'}
            invalid={Boolean(emailError)}
            help={emailError ? <span id={'forgot-email-error'}>{emailError}</span> : null}
          >
            <Input
            ref={emailInputRef}
            id={'forgot-email'}
            name={'email'}
            type={'email'}
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              if (emailError) setEmailError('');
            }}
            required
            autoComplete={'email'}
            placeholder={'your@email.com'}
            aria-invalid={Boolean(emailError) || undefined}
            aria-describedby={emailError ? 'forgot-email-error' : undefined}
            />
          </AuthField>
        </FieldGroup>
        <Button type="submit" className="w-full" disabled={loading} aria-busy={loading}>
          {loading && <Spinner data-icon="inline-start" aria-hidden="true" />}
          {loading ? 'กำลังส่ง...' : 'ส่งลิงก์รีเซ็ตรหัสผ่าน'}
        </Button>
      </form>
      <AuthFootnote><Link href={loginHref}>กลับไปหน้าเข้าสู่ระบบ</Link></AuthFootnote>
    </>
  );
}

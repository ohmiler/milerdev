'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FieldGroup } from '@/components/ui/field';
import { Spinner } from '@/components/ui/spinner';
import { getAuthPublicError } from '@/lib/auth-public-error';
import { getPasswordPolicyError } from '@/lib/password-policy';
import { AuthError, AuthField, AuthFootnote, PasswordInput, RecoveryState } from './AuthFormLayout';
import PasswordPolicyFeedback from './PasswordPolicyFeedback';

export default function ResetPasswordForm({
  token,
  forgotPasswordHref,
  loginHref,
  successLoginHref,
}: {
  token: string | null;
  forgotPasswordHref: string;
  loginHref: string;
  successLoginHref: string;
}) {
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmPasswordRef = useRef<HTMLInputElement>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [invalidLink, setInvalidLink] = useState(false);
  const [error, setError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    const nextPasswordError = getPasswordPolicyError(password);
    if (nextPasswordError) {
      setPasswordError(nextPasswordError);
      setConfirmPasswordError('');
      passwordRef.current?.focus();
      return;
    }

    if (password !== confirmPassword) {
      setPasswordError('');
      setConfirmPasswordError('รหัสผ่านไม่ตรงกัน');
      confirmPasswordRef.current?.focus();
      return;
    }

    setPasswordError('');
    setConfirmPasswordError('');

    setLoading(true);
    try {
      const response = await fetch('/api/auth/reset-password/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
      } else if (data.kind === 'invalid_or_expired_link') {
        setInvalidLink(true);
      } else {
        setError(getAuthPublicError(response.status, data));
      }
    } catch {
      setError('เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <RecoveryState tone={'error'} title={'ลิงก์ไม่สมบูรณ์'} actions={<><Button asChild><Link href={forgotPasswordHref}>ขอลิงก์ใหม่</Link></Button><Button variant={'outline'} asChild><Link href={loginHref}>กลับไปหน้าเข้าสู่ระบบ</Link></Button></>}><p>กรุณาขอลิงก์ตั้งรหัสผ่านใหม่</p></RecoveryState>
    );
  }

  if (invalidLink) {
    return (
      <RecoveryState tone={'error'} title={'ลิงก์นี้ใช้ไม่ได้แล้ว'} actions={<><Button asChild><Link href={forgotPasswordHref}>ขอลิงก์ใหม่</Link></Button><Button variant={'outline'} asChild><Link href={loginHref}>กลับไปหน้าเข้าสู่ระบบ</Link></Button></>}><p>ลิงก์อาจหมดอายุหรือถูกใช้ไปแล้ว กรุณาขอลิงก์ใหม่</p></RecoveryState>
    );
  }

  if (success) {
    return (
      <RecoveryState tone={'success'} title={'ตั้งรหัสผ่านใหม่แล้ว'} actions={<Button asChild><Link href={successLoginHref}>ไปหน้าเข้าสู่ระบบ</Link></Button>}><p>เพื่อความปลอดภัย กรุณาเข้าสู่ระบบอีกครั้ง</p></RecoveryState>
    );
  }

  return (
    <>
      {error && <AuthError live={'polite'}>{error}</AuthError>}
      <form onSubmit={handleSubmit} className="flex flex-col gap-5" aria-busy={loading} noValidate>
        <FieldGroup className="gap-5">
          <AuthField htmlFor="reset-password" label="รหัสผ่านใหม่" invalid={Boolean(passwordError)} help={passwordError ? <span id={'reset-password-error'}>{passwordError}</span> : null}>
            <PasswordInput
              ref={passwordRef}
              id={'reset-password'}
              name={'password'}
              visible={showPassword}
              onVisibilityChange={() => setShowPassword((visible) => !visible)}
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                if (passwordError) setPasswordError('');
              }}
              required
              minLength={8}
              autoComplete={'new-password'}
              placeholder={'••••••••'}
              aria-invalid={Boolean(passwordError) || undefined}
              aria-describedby={passwordError ? 'reset-password-policy reset-password-error' : 'reset-password-policy'}
            />
          </AuthField>

          <AuthField
            htmlFor="reset-confirm-password"
            label="ยืนยันรหัสผ่านใหม่"
            invalid={Boolean(confirmPasswordError)}
            help={confirmPasswordError ? <span id={'reset-confirm-password-error'}>{confirmPasswordError}</span> : null}
          >
            <PasswordInput
            ref={confirmPasswordRef}
            id={'reset-confirm-password'}
            name={'confirmPassword'}
            visible={showConfirmPassword}
            onVisibilityChange={() => setShowConfirmPassword((visible) => !visible)}
            value={confirmPassword}
            onChange={(event) => {
              setConfirmPassword(event.target.value);
              if (confirmPasswordError) setConfirmPasswordError('');
            }}
            required
            minLength={8}
            autoComplete={'new-password'}
            placeholder={'••••••••'}
            aria-invalid={Boolean(confirmPasswordError) || undefined}
            aria-describedby={confirmPasswordError ? 'reset-confirm-password-error' : undefined}
            showLabel="แสดงรหัสผ่านยืนยัน"
            hideLabel="ซ่อนรหัสผ่านยืนยัน"
            />
          </AuthField>
        </FieldGroup>

        <PasswordPolicyFeedback password={password} id={'reset-password-policy'} />

        <Button type="submit" className="w-full" disabled={loading} aria-busy={loading}>
          {loading && <Spinner data-icon="inline-start" aria-hidden="true" />}
          {loading ? 'กำลังบันทึก...' : 'ตั้งรหัสผ่านใหม่'}
        </Button>
      </form>
      <AuthFootnote><Link href={loginHref}>กลับไปหน้าเข้าสู่ระบบ</Link></AuthFootnote>
    </>
  );
}

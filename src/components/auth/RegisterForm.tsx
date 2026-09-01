'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { FieldGroup } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { getAuthPublicError } from '@/lib/auth-public-error';
import type { SafeAuthReturnPath } from '@/lib/safe-auth-return';
import { getPasswordPolicy, getPasswordPolicyError } from '@/lib/password-policy';
import { GoogleIcon } from './AuthIcons';
import { AuthDivider, AuthError, AuthField, AuthFootnote, PasswordInput, RecoveryState } from './AuthFormLayout';
import PasswordPolicyFeedback from './PasswordPolicyFeedback';

export const getPasswordStrength = getPasswordPolicy;

export default function RegisterForm({
  returnTo,
  loginHref,
  forgotPasswordHref,
}: {
  returnTo: SafeAuthReturnPath;
  loginHref: string;
  forgotPasswordHref: string;
}) {
  const router = useRouter();
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmPasswordRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [serverError, setServerError] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [loading, setLoading] = useState(false);
  const [registrationReviewed, setRegistrationReviewed] = useState(false);
  const [invalidField, setInvalidField] = useState<'name' | 'email' | 'password' | 'confirmPassword' | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setServerError('');
    setFieldError('');

    const normalizedEmail = email.trim();
    const passwordPolicyError = getPasswordPolicyError(password);
    const validation = name.trim().length < 2
      ? { field: 'name' as const, message: 'กรุณากรอกชื่ออย่างน้อย 2 ตัวอักษร', ref: nameRef }
      : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
        ? { field: 'email' as const, message: 'กรุณากรอกอีเมลให้ถูกต้อง', ref: emailRef }
        : passwordPolicyError
          ? { field: 'password' as const, message: passwordPolicyError, ref: passwordRef }
          : password !== confirmPassword
            ? { field: 'confirmPassword' as const, message: 'รหัสผ่านไม่ตรงกัน', ref: confirmPasswordRef }
            : null;

    if (validation) {
      setInvalidField(validation.field);
      setFieldError(validation.message);
      validation.ref.current?.focus();
      return;
    }

    setInvalidField(null);
    setFieldError('');

    setLoading(true);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        setServerError(getAuthPublicError(response.status, data));
        return;
      }

      const result = await signIn('credentials', { email, password, redirect: false });
      if (result?.error) {
        setRegistrationReviewed(true);
      } else {
        router.push(returnTo);
        router.refresh();
      }
    } catch {
      setServerError('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  };

  if (registrationReviewed) {
    return (
      <RecoveryState
        tone={'success'}
        title={'ตรวจสอบคำขอแล้ว'}
        actions={<>
          <Button asChild><Link href={loginHref}>เข้าสู่ระบบ</Link></Button>
          <Button asChild variant={'outline'}>
            <Link href={forgotPasswordHref}>ตั้งรหัสผ่านใหม่</Link>
          </Button>
        </>}
      >
        <p>หากบัญชีพร้อมใช้งาน คุณสามารถเข้าสู่ระบบได้</p>
        <p>หากจำรหัสผ่านไม่ได้ ให้ขอลิงก์ตั้งรหัสผ่านใหม่</p>
      </RecoveryState>
    );
  }

  return (
    <>
      {serverError && <AuthError live={'polite'}>{serverError}</AuthError>}
      <form onSubmit={handleSubmit} className="flex flex-col gap-5" aria-busy={loading} noValidate>
        <FieldGroup className="gap-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <AuthField htmlFor="register-name" label="ชื่อ-นามสกุล" invalid={invalidField === 'name'} error={invalidField === 'name' ? { id: 'register-name-error', message: fieldError } : undefined}>
              <Input ref={nameRef} id="register-name" name="name" type="text" value={name} onChange={(event) => { setName(event.target.value); if (invalidField === 'name') { setInvalidField(null); setFieldError(''); } }} required maxLength={100} autoComplete="name" placeholder="ชื่อที่ใช้ในบัญชี" aria-invalid={invalidField === 'name' || undefined} aria-describedby={invalidField === 'name' ? 'register-name-error' : undefined} />
            </AuthField>
            <AuthField htmlFor="register-email" label="อีเมล" invalid={invalidField === 'email'} error={invalidField === 'email' ? { id: 'register-email-error', message: fieldError } : undefined}>
              <Input ref={emailRef} id="register-email" name="email" type="email" value={email} onChange={(event) => { setEmail(event.target.value); if (invalidField === 'email') { setInvalidField(null); setFieldError(''); } }} required autoComplete="email" inputMode="email" spellCheck={false} placeholder="name@example.com" aria-invalid={invalidField === 'email' || undefined} aria-describedby={invalidField === 'email' ? 'register-email-error' : undefined} />
            </AuthField>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <AuthField htmlFor="register-password" label="รหัสผ่าน" invalid={invalidField === 'password'} error={invalidField === 'password' ? { id: 'register-password-error', message: fieldError } : undefined}>
              <PasswordInput ref={passwordRef} id="register-password" name="password" visible={showPassword} onVisibilityChange={() => setShowPassword((visible) => !visible)} value={password} onChange={(event) => { setPassword(event.target.value); if (invalidField === 'password') { setInvalidField(null); setFieldError(''); } }} required autoComplete="new-password" placeholder="อย่างน้อย 8 ตัวอักษร" aria-invalid={invalidField === 'password' || undefined} aria-describedby={invalidField === 'password' ? 'register-password-strength register-password-error' : 'register-password-strength'} />
            </AuthField>
            <AuthField
              htmlFor="register-confirm-password"
              label="ยืนยันรหัสผ่าน"
              invalid={invalidField === 'confirmPassword' || Boolean(confirmPassword && confirmPassword !== password)}
              error={invalidField === 'confirmPassword' ? { id: 'register-confirm-error', message: fieldError } : undefined}
              help={<span id="register-confirm-status" aria-live="polite">{confirmPassword ? (confirmPassword === password ? 'รหัสผ่านตรงกัน' : 'รหัสผ่านไม่ตรงกัน') : 'พิมพ์รหัสผ่านเดิมอีกครั้ง'}</span>}
            >
              <PasswordInput ref={confirmPasswordRef} id="register-confirm-password" name="confirmPassword" visible={showConfirmPassword} onVisibilityChange={() => setShowConfirmPassword((visible) => !visible)} value={confirmPassword} onChange={(event) => { setConfirmPassword(event.target.value); if (invalidField === 'confirmPassword') { setInvalidField(null); setFieldError(''); } }} required autoComplete="new-password" placeholder="พิมพ์รหัสผ่านอีกครั้ง" aria-invalid={invalidField === 'confirmPassword' || Boolean(confirmPassword && confirmPassword !== password) || undefined} aria-describedby={invalidField === 'confirmPassword' ? 'register-confirm-status register-confirm-error' : 'register-confirm-status'} showLabel="แสดงรหัสผ่านยืนยัน" hideLabel="ซ่อนรหัสผ่านยืนยัน" />
            </AuthField>
          </div>
        </FieldGroup>

        <PasswordPolicyFeedback password={password} id={'register-password-strength'} />
        <Button type="submit" className="w-full" disabled={loading} aria-busy={loading}>
          {loading && <Spinner data-icon="inline-start" aria-hidden="true" />}
          {loading ? 'กำลังสร้างบัญชี...' : 'สร้างบัญชีสมาชิก'}
        </Button>
      </form>

      <AuthDivider>หรือใช้บัญชี Google</AuthDivider>
      <Button type="button" variant="outline" className="w-full" onClick={() => signIn('google', { callbackUrl: returnTo })}><GoogleIcon />สมัครสมาชิกด้วย Google</Button>
      <AuthFootnote>มีบัญชีอยู่แล้ว? <Link href={loginHref}>เข้าสู่ระบบ</Link></AuthFootnote>
      <p className="mt-2 text-center text-xs leading-5 text-muted-foreground">การสมัครสมาชิกหมายถึงคุณยอมรับ <Link className={'underline underline-offset-4'} href={'/terms'}>ข้อกำหนดการใช้งาน</Link> และ <Link className={'underline underline-offset-4'} href={'/privacy'}>นโยบายความเป็นส่วนตัว</Link> ของ MilerDev</p>
    </>
  );
}

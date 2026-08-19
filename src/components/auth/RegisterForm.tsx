'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { FormButton, FormInput } from '@/components/ui/FormControls';
import { Progress } from '@/components/ui/progress';
import { GoogleIcon, PasswordIcon } from './AuthIcons';
import { AuthDivider, AuthError, AuthField, AuthFootnote, PasswordField } from './AuthFormLayout';

export const getPasswordStrength = (password: string) => {
  let score = 0;
  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };
  Object.values(checks).forEach((passes) => {
    if (passes) score++;
  });

  let label = 'อ่อนมาก';
  if (score >= 5) label = 'แข็งแกร่งมาก';
  else if (score >= 4) label = 'แข็งแกร่ง';
  else if (score >= 3) label = 'ปานกลาง';
  else if (score >= 2) label = 'อ่อน';

  return { score, checks, label, percentage: (score / 5) * 100 };
};

export default function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (name.trim().length < 2) return setError('ชื่อต้องมีอย่างน้อย 2 ตัวอักษร');
    if (password.length < 8) return setError('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร');
    if (!passwordStrength.checks.uppercase) return setError('รหัสผ่านต้องมีตัวพิมพ์ใหญ่อย่างน้อย 1 ตัว');
    if (!passwordStrength.checks.lowercase) return setError('รหัสผ่านต้องมีตัวพิมพ์เล็กอย่างน้อย 1 ตัว');
    if (!passwordStrength.checks.number) return setError('รหัสผ่านต้องมีตัวเลขอย่างน้อย 1 ตัว');
    if (password !== confirmPassword) return setError('รหัสผ่านไม่ตรงกัน');

    setLoading(true);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'เกิดข้อผิดพลาด กรุณาลองใหม่');
        return;
      }

      const result = await signIn('credentials', { email, password, redirect: false });
      if (result?.error) {
        router.push('/login');
      } else {
        router.push('/dashboard');
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
      <form onSubmit={handleSubmit} className="space-y-5" aria-busy={loading}>
        <div className="grid gap-5 sm:grid-cols-2">
          <AuthField htmlFor="register-name" label="ชื่อ-นามสกุล">
            <FormInput id={'register-name'} name={'name'} type={'text'} value={name} onChange={(event) => setName(event.target.value)} required maxLength={100} autoComplete={'name'} placeholder={'ชื่อที่ใช้ในบัญชี'} />
          </AuthField>
          <AuthField htmlFor="register-email" label="อีเมล">
            <FormInput id={'register-email'} name={'email'} type={'email'} value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete={'email'} placeholder={'name@example.com'} />
          </AuthField>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <AuthField htmlFor="register-password" label="รหัสผ่าน">
            <PasswordField action={<button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'} aria-pressed={showPassword}><PasswordIcon visible={showPassword} /></button>}>
              <FormInput id={'register-password'} name={'password'} type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete={'new-password'} placeholder={'อย่างน้อย 8 ตัวอักษร'} aria-describedby={'register-password-strength'} />
            </PasswordField>
          </AuthField>
          <AuthField htmlFor="register-confirm-password" label="ยืนยันรหัสผ่าน" help={<span id="register-confirm-status" className={confirmPassword ? (confirmPassword === password ? 'text-emerald-700' : 'text-destructive') : undefined} aria-live="polite">{confirmPassword ? (confirmPassword === password ? 'รหัสผ่านตรงกัน' : 'รหัสผ่านไม่ตรงกัน') : 'พิมพ์รหัสผ่านเดิมอีกครั้ง'}</span>}>
            <PasswordField action={<button type="button" onClick={() => setShowConfirmPassword((visible) => !visible)} aria-label={showConfirmPassword ? 'ซ่อนรหัสผ่านยืนยัน' : 'แสดงรหัสผ่านยืนยัน'} aria-pressed={showConfirmPassword}><PasswordIcon visible={showConfirmPassword} /></button>}>
              <FormInput id={'register-confirm-password'} name={'confirmPassword'} type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required autoComplete={'new-password'} placeholder={'พิมพ์รหัสผ่านอีกครั้ง'} invalid={Boolean(confirmPassword && confirmPassword !== password)} aria-describedby={'register-confirm-status'} />
            </PasswordField>
          </AuthField>
        </div>

        <div id="register-password-strength" className="rounded-2xl border bg-muted/30 p-4" aria-live="polite">
          <div className="mb-3 flex items-center justify-between gap-3 text-xs"><span className="text-muted-foreground">ความแข็งแกร่งของรหัสผ่าน</span><strong>{password ? passwordStrength.label : 'ยังไม่ได้ระบุ'}</strong></div>
          <Progress value={passwordStrength.percentage} aria-label={`ความแข็งแกร่ง ${passwordStrength.percentage}%`} />
          <ul className="mt-4 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
            <li className={passwordStrength.checks.length ? 'text-emerald-700' : undefined}>✓ อย่างน้อย 8 ตัวอักษร</li>
            <li className={passwordStrength.checks.uppercase ? 'text-emerald-700' : undefined}>✓ มีตัวพิมพ์ใหญ่</li>
            <li className={passwordStrength.checks.lowercase ? 'text-emerald-700' : undefined}>✓ มีตัวพิมพ์เล็ก</li>
            <li className={passwordStrength.checks.number ? 'text-emerald-700' : undefined}>✓ มีตัวเลข</li>
            <li className={passwordStrength.checks.special ? 'text-emerald-700' : undefined}>✓ อักขระพิเศษ (แนะนำ)</li>
          </ul>
        </div>
        <FormButton type={'submit'} block pending={loading} disabled={loading}>{loading ? 'กำลังสร้างบัญชี...' : 'สร้างบัญชีผู้เรียน'}</FormButton>
      </form>

      <AuthDivider>หรือใช้บัญชี Google</AuthDivider>
      <FormButton type={'button'} variant={'secondary'} block onClick={() => signIn('google', { callbackUrl: '/dashboard' })}><GoogleIcon />สมัครสมาชิกด้วย Google</FormButton>
      <AuthFootnote>มีบัญชีอยู่แล้ว? <Link href="/login">เข้าสู่ระบบ</Link></AuthFootnote>
      <p className="mt-2 text-center text-xs leading-5 text-muted-foreground">การสมัครสมาชิกหมายถึงคุณยอมรับข้อกำหนดการใช้งานและนโยบายความเป็นส่วนตัวของ MilerDev</p>
    </>
  );
}

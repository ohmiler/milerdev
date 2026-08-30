'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { FieldGroup } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Spinner } from '@/components/ui/spinner';
import { GoogleIcon } from './AuthIcons';
import { AuthDivider, AuthError, AuthField, AuthFootnote, PasswordInput } from './AuthFormLayout';

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
      <form onSubmit={handleSubmit} className="flex flex-col gap-5" aria-busy={loading}>
        <FieldGroup className="gap-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <AuthField htmlFor="register-name" label="ชื่อ-นามสกุล">
              <Input id="register-name" name="name" type="text" value={name} onChange={(event) => setName(event.target.value)} required maxLength={100} autoComplete="name" placeholder="ชื่อที่ใช้ในบัญชี" />
            </AuthField>
            <AuthField htmlFor="register-email" label="อีเมล">
              <Input id="register-email" name="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" placeholder="name@example.com" />
            </AuthField>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <AuthField htmlFor="register-password" label="รหัสผ่าน">
              <PasswordInput id="register-password" name="password" visible={showPassword} onVisibilityChange={() => setShowPassword((visible) => !visible)} value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="new-password" placeholder="อย่างน้อย 8 ตัวอักษร" aria-describedby="register-password-strength" />
            </AuthField>
            <AuthField
              htmlFor="register-confirm-password"
              label="ยืนยันรหัสผ่าน"
              invalid={Boolean(confirmPassword && confirmPassword !== password)}
              help={<span id="register-confirm-status" aria-live="polite">{confirmPassword ? (confirmPassword === password ? 'รหัสผ่านตรงกัน' : 'รหัสผ่านไม่ตรงกัน') : 'พิมพ์รหัสผ่านเดิมอีกครั้ง'}</span>}
            >
              <PasswordInput id="register-confirm-password" name="confirmPassword" visible={showConfirmPassword} onVisibilityChange={() => setShowConfirmPassword((visible) => !visible)} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required autoComplete="new-password" placeholder="พิมพ์รหัสผ่านอีกครั้ง" aria-invalid={Boolean(confirmPassword && confirmPassword !== password) || undefined} aria-describedby="register-confirm-status" showLabel="แสดงรหัสผ่านยืนยัน" hideLabel="ซ่อนรหัสผ่านยืนยัน" />
            </AuthField>
          </div>
        </FieldGroup>

        <Card id="register-password-strength" aria-live="polite">
          <CardHeader>
            <CardTitle>ความแข็งแกร่งของรหัสผ่าน</CardTitle>
            <CardDescription>{password ? passwordStrength.label : 'ยังไม่ได้ระบุ'}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Progress value={passwordStrength.percentage} aria-label={`ความแข็งแกร่ง ${passwordStrength.percentage}%`} />
            <ul className="grid gap-2 sm:grid-cols-2">
              <li><Badge variant={passwordStrength.checks.length ? 'secondary' : 'outline'}>อย่างน้อย 8 ตัวอักษร</Badge></li>
              <li><Badge variant={passwordStrength.checks.uppercase ? 'secondary' : 'outline'}>มีตัวพิมพ์ใหญ่</Badge></li>
              <li><Badge variant={passwordStrength.checks.lowercase ? 'secondary' : 'outline'}>มีตัวพิมพ์เล็ก</Badge></li>
              <li><Badge variant={passwordStrength.checks.number ? 'secondary' : 'outline'}>มีตัวเลข</Badge></li>
              <li><Badge variant={passwordStrength.checks.special ? 'secondary' : 'outline'}>อักขระพิเศษ (แนะนำ)</Badge></li>
            </ul>
          </CardContent>
        </Card>
        <Button type="submit" className="w-full" disabled={loading} aria-busy={loading}>
          {loading && <Spinner data-icon="inline-start" aria-hidden="true" />}
          {loading ? 'กำลังสร้างบัญชี...' : 'สร้างบัญชีผู้เรียน'}
        </Button>
      </form>

      <AuthDivider>หรือใช้บัญชี Google</AuthDivider>
      <Button type="button" variant="outline" className="w-full" onClick={() => signIn('google', { callbackUrl: '/dashboard' })}><GoogleIcon />สมัครสมาชิกด้วย Google</Button>
      <AuthFootnote>มีบัญชีอยู่แล้ว? <Link href="/login">เข้าสู่ระบบ</Link></AuthFootnote>
      <p className="mt-2 text-center text-xs leading-5 text-muted-foreground">การสมัครสมาชิกหมายถึงคุณยอมรับข้อกำหนดการใช้งานและนโยบายความเป็นส่วนตัวของ MilerDev</p>
    </>
  );
}

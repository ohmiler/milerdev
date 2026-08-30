'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { FieldGroup } from '@/components/ui/field';
import { Spinner } from '@/components/ui/spinner';
import { AuthError, AuthField, AuthFootnote, PasswordInput, RecoveryState } from './AuthFormLayout';

export default function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('รหัสผ่านไม่ตรงกัน');
      return;
    }

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
      } else {
        setError(data.error || 'เกิดข้อผิดพลาด กรุณาลองใหม่');
      }
    } catch {
      setError('เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <RecoveryState tone="error" title="ลิงก์ไม่ถูกต้อง" actions={<><Button asChild><Link href={'/forgot-password'}>ขอลิงก์รีเซ็ตใหม่</Link></Button><Button variant="outline" asChild><Link href={'/login'}>กลับไปหน้าเข้าสู่ระบบ</Link></Button></>}><p>ลิงก์รีเซ็ตรหัสผ่านไม่ถูกต้อง กรุณาขอลิงก์ใหม่</p></RecoveryState>
    );
  }

  if (success) {
    return (
      <RecoveryState tone="success" title="ตั้งรหัสผ่านใหม่สำเร็จ!" actions={<Button asChild><Link href={'/login'}>ไปหน้าเข้าสู่ระบบ</Link></Button>}><p>คุณสามารถเข้าสู่ระบบด้วยรหัสผ่านใหม่ได้แล้ว</p></RecoveryState>
    );
  }

  return (
    <>
      {error && <AuthError>{error}</AuthError>}
      <form onSubmit={handleSubmit} className="flex flex-col gap-5" aria-busy={loading}>
        <FieldGroup className="gap-5">
          <AuthField htmlFor="reset-password" label="รหัสผ่านใหม่" help={<span id="reset-password-help">อย่างน้อย 8 ตัวอักษร มีตัวพิมพ์ใหญ่ ตัวพิมพ์เล็ก และตัวเลข</span>}>
            <PasswordInput
              id={'reset-password'}
              name={'password'}
              visible={showPassword}
              onVisibilityChange={() => setShowPassword((visible) => !visible)}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={8}
              autoComplete={'new-password'}
              placeholder={'••••••••'}
              aria-describedby={'reset-password-help'}
            />
          </AuthField>

          <AuthField
            htmlFor="reset-confirm-password"
            label="ยืนยันรหัสผ่านใหม่"
            invalid={Boolean(confirmPassword && password !== confirmPassword)}
          >
            <PasswordInput
            id={'reset-confirm-password'}
            name={'confirmPassword'}
            visible={showPassword}
            onVisibilityChange={() => setShowPassword((visible) => !visible)}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            minLength={8}
            autoComplete={'new-password'}
            placeholder={'••••••••'}
            aria-invalid={Boolean(confirmPassword && password !== confirmPassword) || undefined}
            showLabel="แสดงรหัสผ่านยืนยัน"
            hideLabel="ซ่อนรหัสผ่านยืนยัน"
            />
          </AuthField>
        </FieldGroup>

        <Button type="submit" className="w-full" disabled={loading} aria-busy={loading}>
          {loading && <Spinner data-icon="inline-start" aria-hidden="true" />}
          {loading ? 'กำลังบันทึก...' : 'ตั้งรหัสผ่านใหม่'}
        </Button>
      </form>
      <AuthFootnote><Link href={'/login'}>กลับไปหน้าเข้าสู่ระบบ</Link></AuthFootnote>
    </>
  );
}

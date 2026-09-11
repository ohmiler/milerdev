'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getPasswordPolicyError } from '@/lib/password-policy';
import { AuthError, AuthField, PasswordInput, RecoveryState } from './AuthFormLayout';
import PasswordPolicyFeedback from './PasswordPolicyFeedback';

export default function VerifyEmailForm({ registerHref, loginHref }: { registerHref: string; loginHref: string }) {
  const [token, setToken] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [completedHref, setCompletedHref] = useState('');
  const initialized = useRef(false);
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const value = new URLSearchParams(window.location.hash.slice(1)).get('token') ?? '';
    // Keep the bearer link out of later history entries and request URLs.
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    setToken(/^[a-f0-9]{64}$/.test(value) ? value : '');
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (loading || !token) return;
    const validation = name.trim().length < 2 ? 'กรุณากรอกชื่ออย่างน้อย 2 ตัวอักษร'
      : getPasswordPolicyError(password) || (password !== confirmation ? 'รหัสผ่านไม่ตรงกัน' : '');
    if (validation) { setError(validation); return; }
    setLoading(true); setError('');
    try {
      const response = await fetch('/api/auth/register/confirm', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, name: name.trim(), password }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(response.status === 429 ? 'ส่งคำขอถี่เกินไป กรุณารอสักครู่' : 'ไม่สามารถยืนยันได้ ลิงก์อาจหมดอายุ ถูกใช้แล้ว หรือมีบัญชีอยู่แล้ว กรุณาลองใหม่หรือเข้าสู่ระบบ');
        return;
      }
      setToken(''); setPassword(''); setConfirmation('');
      setCompletedHref(typeof data.loginHref === 'string' && data.loginHref.startsWith('/login?callbackUrl=') ? data.loginHref : loginHref);
    } catch { setError('เกิดข้อผิดพลาด กรุณาลองใหม่'); }
    finally { setLoading(false); }
  }

  if (completedHref) return <RecoveryState tone="success" title="ยืนยันอีเมลและสร้างบัญชีแล้ว" actions={<Button asChild><Link href={completedHref}>เข้าสู่ระบบ</Link></Button>}><p>ใช้รหัสผ่านที่คุณเพิ่งตั้งเพื่อเข้าสู่ระบบ</p></RecoveryState>;
  if (token === null) return <p role="status">กำลังเตรียมแบบฟอร์ม...</p>;
  if (!token) return <RecoveryState tone="error" title="กรุณาเปิดลิงก์จากอีเมล" actions={<Button asChild><Link href={registerHref}>ขอลิงก์ยืนยันใหม่</Link></Button>}><p>หากรีเฟรชหน้านี้ ให้เปิดลิงก์จากอีเมลอีกครั้ง</p></RecoveryState>;
  return <>
    {error && <AuthError>{error}</AuthError>}
    <form onSubmit={submit} className="flex flex-col gap-5" aria-busy={loading}>
      <AuthField htmlFor="verify-name" label="ชื่อ-นามสกุล"><Input id="verify-name" name="name" autoComplete="name" required minLength={2} maxLength={100} value={name} onChange={(event) => setName(event.target.value)} /></AuthField>
      <AuthField htmlFor="verify-password" label="รหัสผ่าน"><PasswordInput id="verify-password" name="password" autoComplete="new-password" required visible={visible} onVisibilityChange={() => setVisible((value) => !value)} value={password} onChange={(event) => setPassword(event.target.value)} /></AuthField>
      <PasswordPolicyFeedback password={password} id="verify-password-policy" />
      <AuthField htmlFor="verify-confirm" label="ยืนยันรหัสผ่าน"><Input id="verify-confirm" name="confirmPassword" type="password" autoComplete="new-password" required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></AuthField>
      <p className="text-sm">การสร้างบัญชีหมายถึงคุณยอมรับ <Link href="/terms">ข้อกำหนดการใช้งาน</Link> และ <Link href="/privacy">นโยบายความเป็นส่วนตัว</Link></p>
      <Button type="submit" disabled={loading}>{loading ? 'กำลังสร้างบัญชี...' : 'ยืนยันอีเมลและสร้างบัญชี'}</Button>
    </form>
    <div className="mt-4 flex gap-4"><Link href={registerHref}>ขอลิงก์ยืนยันใหม่</Link><Link href={loginHref}>เข้าสู่ระบบ</Link></div>
  </>;
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FieldGroup } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { AuthError, AuthField, AuthFootnote, RecoveryState } from './AuthFormLayout';

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        setSent(true);
      } else {
        const data = await response.json();
        setError(data.error || 'เกิดข้อผิดพลาด กรุณาลองใหม่');
      }
    } catch {
      setError('เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <RecoveryState tone="success" title="ส่งลิงก์รีเซ็ตแล้ว!" actions={<><Button type={'button'} variant="outline" onClick={() => { setSent(false); setEmail(''); }}>ลองใหม่อีกครั้ง</Button><Button asChild><Link href={'/login'}>กลับไปหน้าเข้าสู่ระบบ</Link></Button></>}>
        <p>หากอีเมล <strong>{email}</strong> มีในระบบ คุณจะได้รับลิงก์สำหรับตั้งรหัสผ่านใหม่ภายในไม่กี่นาที</p>
        <p>ไม่ได้รับอีเมล? ตรวจสอบโฟลเดอร์สแปม แล้วลองส่งใหม่ได้</p>
      </RecoveryState>
    );
  }

  return (
    <>
      {error && <AuthError>{error}</AuthError>}
      <form onSubmit={handleSubmit} className="flex flex-col gap-5" aria-busy={loading}>
        <FieldGroup className="gap-5">
          <AuthField htmlFor="forgot-email" label="อีเมล">
            <Input
            id={'forgot-email'}
            name={'email'}
            type={'email'}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            autoComplete={'email'}
            placeholder={'your@email.com'}
            />
          </AuthField>
        </FieldGroup>
        <Button type="submit" className="w-full" disabled={loading} aria-busy={loading}>
          {loading && <Spinner data-icon="inline-start" aria-hidden="true" />}
          {loading ? 'กำลังส่ง...' : 'ส่งลิงก์รีเซ็ตรหัสผ่าน'}
        </Button>
      </form>
      <AuthFootnote><Link href={'/login'}>กลับไปหน้าเข้าสู่ระบบ</Link></AuthFootnote>
    </>
  );
}

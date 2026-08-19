'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FormButton, FormInput } from '@/components/ui/FormControls';
import { Button } from '@/components/ui/button';
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
      <form onSubmit={handleSubmit} className="space-y-5" aria-busy={loading}>
        <AuthField htmlFor="forgot-email" label="อีเมล">
          <FormInput
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
        <FormButton type={'submit'} block pending={loading} disabled={loading}>
          {loading ? 'กำลังส่ง...' : 'ส่งลิงก์รีเซ็ตรหัสผ่าน'}
        </FormButton>
      </form>
      <AuthFootnote><Link href={'/login'}>กลับไปหน้าเข้าสู่ระบบ</Link></AuthFootnote>
    </>
  );
}

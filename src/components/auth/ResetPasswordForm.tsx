'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { FormButton, FormInput } from '@/components/ui/FormControls';
import { PasswordIcon } from './AuthIcons';
import styles from './auth.module.css';

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
      <section className={styles.recoveryState} data-tone={'error'} aria-labelledby={'reset-missing-title'}>
        <div className={styles.stateMark} aria-hidden={'true'}>ERR</div>
        <h2 id={'reset-missing-title'}>ลิงก์ไม่ถูกต้อง</h2>
        <p>ลิงก์รีเซ็ตรหัสผ่านไม่ถูกต้อง กรุณาขอลิงก์ใหม่</p>
        <div className={styles.recoveryActions}>
          <Link href={'/forgot-password'} className={styles.recoveryLink}>ขอลิงก์รีเซ็ตใหม่</Link>
          <Link href={'/login'} className={styles.recoveryLink}>กลับไปหน้าเข้าสู่ระบบ</Link>
        </div>
      </section>
    );
  }

  if (success) {
    return (
      <section className={styles.recoveryState} data-tone={'success'} aria-labelledby={'reset-success-title'}>
        <div className={styles.stateMark} aria-hidden={'true'}>OK</div>
        <h2 id={'reset-success-title'}>ตั้งรหัสผ่านใหม่สำเร็จ!</h2>
        <p>คุณสามารถเข้าสู่ระบบด้วยรหัสผ่านใหม่ได้แล้ว</p>
        <div className={styles.recoveryActions}>
          <Link href={'/login'} className={styles.recoveryLink}>ไปหน้าเข้าสู่ระบบ</Link>
        </div>
      </section>
    );
  }

  return (
    <>
      {error && <div className={styles.alert} role={'alert'}>{error}</div>}
      <form onSubmit={handleSubmit} className={styles.form} aria-busy={loading}>
        <div className={styles.field}>
          <label htmlFor={'reset-password'}>รหัสผ่านใหม่</label>
          <div className={styles.passwordField}>
            <FormInput
              id={'reset-password'}
              name={'password'}
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={8}
              autoComplete={'new-password'}
              placeholder={'••••••••'}
              aria-describedby={'reset-password-help'}
            />
            <button
              type={'button'}
              onClick={() => setShowPassword((visible) => !visible)}
              aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
              aria-pressed={showPassword}
            >
              <PasswordIcon visible={showPassword} />
            </button>
          </div>
          <p id={'reset-password-help'} className={styles.helper}>อย่างน้อย 8 ตัวอักษร มีตัวพิมพ์ใหญ่ ตัวพิมพ์เล็ก และตัวเลข</p>
        </div>

        <div className={styles.field}>
          <label htmlFor={'reset-confirm-password'}>ยืนยันรหัสผ่านใหม่</label>
          <FormInput
            id={'reset-confirm-password'}
            name={'confirmPassword'}
            type={showPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            minLength={8}
            autoComplete={'new-password'}
            placeholder={'••••••••'}
          />
        </div>

        <FormButton type={'submit'} block pending={loading} disabled={loading}>
          {loading ? 'กำลังบันทึก...' : 'ตั้งรหัสผ่านใหม่'}
        </FormButton>
      </form>
      <p className={styles.switchLink}><Link href={'/login'}>กลับไปหน้าเข้าสู่ระบบ</Link></p>
    </>
  );
}

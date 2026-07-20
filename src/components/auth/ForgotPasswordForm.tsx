'use client';

import { useState } from 'react';
import Link from 'next/link';
import styles from './auth.module.css';

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
      <section className={styles.recoveryState} data-tone={'success'} aria-labelledby={'forgot-success-title'}>
        <div className={styles.stateMark} aria-hidden={'true'}>OK</div>
        <h2 id={'forgot-success-title'}>ส่งลิงก์รีเซ็ตแล้ว!</h2>
        <p>หากอีเมล <strong>{email}</strong> มีในระบบ คุณจะได้รับลิงก์สำหรับตั้งรหัสผ่านใหม่ภายในไม่กี่นาที</p>
        <p>ไม่ได้รับอีเมล? ตรวจสอบโฟลเดอร์สแปม แล้วลองส่งใหม่ได้</p>
        <div className={styles.recoveryActions}>
          <button
            type={'button'}
            className={styles.retryButton}
            onClick={() => {
              setSent(false);
              setEmail('');
            }}
          >
            ลองใหม่อีกครั้ง
          </button>
          <Link href={'/login'} className={styles.recoveryLink}>กลับไปหน้าเข้าสู่ระบบ</Link>
        </div>
      </section>
    );
  }

  return (
    <>
      {error && <div className={styles.alert} role={'alert'}>{error}</div>}
      <form onSubmit={handleSubmit} className={styles.form} aria-busy={loading}>
        <div className={styles.field}>
          <label htmlFor={'forgot-email'}>อีเมล</label>
          <input
            id={'forgot-email'}
            name={'email'}
            type={'email'}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            autoComplete={'email'}
            placeholder={'your@email.com'}
          />
        </div>
        <button type={'submit'} className={styles.primaryButton} disabled={loading}>
          {loading ? 'กำลังส่ง...' : 'ส่งลิงก์รีเซ็ตรหัสผ่าน'}
        </button>
      </form>
      <p className={styles.switchLink}><Link href={'/login'}>กลับไปหน้าเข้าสู่ระบบ</Link></p>
    </>
  );
}

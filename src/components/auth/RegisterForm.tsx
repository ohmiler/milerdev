'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { GoogleIcon, PasswordIcon } from './AuthIcons';
import styles from './auth.module.css';

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
      {error && <div className={styles.alert} role={'alert'}>{error}</div>}
      <form onSubmit={handleSubmit} className={styles.form} aria-busy={loading}>
        <div className={styles.formGrid}>
          <div className={styles.field}>
            <label htmlFor={'register-name'}>ชื่อ-นามสกุล</label>
            <input id={'register-name'} name={'name'} type={'text'} value={name} onChange={(event) => setName(event.target.value)} required maxLength={100} autoComplete={'name'} placeholder={'ชื่อที่ใช้ในบัญชี'} />
          </div>
          <div className={styles.field}>
            <label htmlFor={'register-email'}>อีเมล</label>
            <input id={'register-email'} name={'email'} type={'email'} value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete={'email'} placeholder={'name@example.com'} />
          </div>
        </div>

        <div className={styles.formGrid}>
          <div className={styles.field}>
            <label htmlFor={'register-password'}>รหัสผ่าน</label>
            <div className={styles.passwordField}>
              <input id={'register-password'} name={'password'} type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete={'new-password'} placeholder={'อย่างน้อย 8 ตัวอักษร'} aria-describedby={'register-password-strength'} />
              <button type={'button'} onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'} aria-pressed={showPassword}><PasswordIcon visible={showPassword} /></button>
            </div>
          </div>
          <div className={styles.field}>
            <label htmlFor={'register-confirm-password'}>ยืนยันรหัสผ่าน</label>
            <div className={styles.passwordField}>
              <input id={'register-confirm-password'} name={'confirmPassword'} type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required autoComplete={'new-password'} placeholder={'พิมพ์รหัสผ่านอีกครั้ง'} aria-invalid={Boolean(confirmPassword && confirmPassword !== password)} aria-describedby={'register-confirm-status'} />
              <button type={'button'} onClick={() => setShowConfirmPassword((visible) => !visible)} aria-label={showConfirmPassword ? 'ซ่อนรหัสผ่านยืนยัน' : 'แสดงรหัสผ่านยืนยัน'} aria-pressed={showConfirmPassword}><PasswordIcon visible={showConfirmPassword} /></button>
            </div>
            <div id={'register-confirm-status'} className={styles.matchStatus} data-valid={Boolean(confirmPassword && confirmPassword === password)} aria-live={'polite'}>
              {confirmPassword ? (confirmPassword === password ? 'รหัสผ่านตรงกัน' : 'รหัสผ่านไม่ตรงกัน') : ''}
            </div>
          </div>
        </div>

        <div id={'register-password-strength'} className={styles.strength} data-score={passwordStrength.score} aria-live={'polite'}>
          <div className={styles.strengthHeader}><span>ความแข็งแกร่งของรหัสผ่าน</span><strong>{password ? passwordStrength.label : 'ยังไม่ได้ระบุ'}</strong></div>
          <div className={styles.strengthTrack} aria-hidden={'true'}><span /></div>
          <ul>
            <li data-valid={passwordStrength.checks.length}>อย่างน้อย 8 ตัวอักษร</li>
            <li data-valid={passwordStrength.checks.uppercase}>มีตัวพิมพ์ใหญ่</li>
            <li data-valid={passwordStrength.checks.lowercase}>มีตัวพิมพ์เล็ก</li>
            <li data-valid={passwordStrength.checks.number}>มีตัวเลข</li>
            <li data-valid={passwordStrength.checks.special}>อักขระพิเศษ (แนะนำ)</li>
          </ul>
        </div>
        <button type={'submit'} className={styles.primaryButton} disabled={loading}>{loading ? 'กำลังสร้างบัญชี...' : 'สร้างบัญชีผู้เรียน'}</button>
      </form>

      <div className={styles.divider}><span>หรือใช้บัญชี Google</span></div>
      <button type={'button'} onClick={() => signIn('google', { callbackUrl: '/dashboard' })} className={styles.providerButton}><GoogleIcon />สมัครสมาชิกด้วย Google</button>
      <p className={styles.switchLink}>มีบัญชีอยู่แล้ว? <Link href={'/login'}>เข้าสู่ระบบ</Link></p>
      <p className={styles.privacy}>การสมัครสมาชิกหมายถึงคุณยอมรับข้อกำหนดการใช้งานและนโยบายความเป็นส่วนตัวของ MilerDev</p>
    </>
  );
}

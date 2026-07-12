'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

// Eye icon components
const EyeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

const EyeOffIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

// Password strength calculator
const getPasswordStrength = (password: string) => {
  let score = 0;
  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };

  if (checks.length) score++;
  if (checks.uppercase) score++;
  if (checks.lowercase) score++;
  if (checks.number) score++;
  if (checks.special) score++;

  let label = 'อ่อนมาก';
  let color = '#dc2626';
  
  if (score >= 5) { label = 'แข็งแกร่งมาก'; color = '#16a34a'; }
  else if (score >= 4) { label = 'แข็งแกร่ง'; color = '#22c55e'; }
  else if (score >= 3) { label = 'ปานกลาง'; color = '#f59e0b'; }
  else if (score >= 2) { label = 'อ่อน'; color = '#f97316'; }

  return { score, checks, label, color, percentage: (score / 5) * 100 };
};

export default function RegisterPage() {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Name validation
    if (name.trim().length < 2) {
      setError('ชื่อต้องมีอย่างน้อย 2 ตัวอักษร');
      return;
    }

    // Password validation (match API requirements)
    if (password.length < 8) {
      setError('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร');
      return;
    }

    if (!passwordStrength.checks.uppercase) {
      setError('รหัสผ่านต้องมีตัวพิมพ์ใหญ่อย่างน้อย 1 ตัว');
      return;
    }

    if (!passwordStrength.checks.lowercase) {
      setError('รหัสผ่านต้องมีตัวพิมพ์เล็กอย่างน้อย 1 ตัว');
      return;
    }

    if (!passwordStrength.checks.number) {
      setError('รหัสผ่านต้องมีตัวเลขอย่างน้อย 1 ตัว');
      return;
    }

    if (password !== confirmPassword) {
      setError('รหัสผ่านไม่ตรงกัน');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'เกิดข้อผิดพลาด กรุณาลองใหม่');
        return;
      }

      // Auto login after registration
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

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
      <Navbar />
      <main className="login-shell register-shell">
        <div className="container login-shell__grid">
          <section className="login-context register-context" aria-labelledby="register-context-title">
            <div className="login-context__brand">
              <Image src="/milerdev-logo-transparent.png" alt="" width={44} height={44} priority />
              <span>MilerDev Learning</span>
            </div>
            <div className="login-context__copy">
              <p className="login-context__meta">Start learning</p>
              <h2 id="register-context-title">สร้างบัญชี<br />เพื่อเก็บทุกก้าวที่เรียน</h2>
              <p>บัญชี MilerDev ช่วยจำคอร์ส บทเรียนล่าสุด progress และใบประกาศ เพื่อให้คุณกลับมาเรียนต่อได้โดยไม่เสียจังหวะ</p>
            </div>
            <ul className="register-context__list">
              <li><span>Course access</span><p>เปิดคอร์สที่สมัครไว้จาก dashboard เดียว</p></li>
              <li><span>Learning progress</span><p>บันทึกบทเรียนที่เรียนจบและจุดที่ควรเรียนต่อ</p></li>
              <li><span>Certificates</span><p>เก็บและดาวน์โหลดใบประกาศเมื่อจบหลักสูตร</p></li>
            </ul>
          </section>

          <section className="login-panel register-panel" aria-labelledby="register-title">
            <div className="login-panel__head">
              <p className="login-panel__meta">Create account</p>
              <h1 id="register-title">สมัครสมาชิก</h1>
              <p>กรอกข้อมูลสำหรับบัญชีผู้เรียน หรือสมัครด้วย Google</p>
            </div>

            {error && <div className="login-error" role="alert">{error}</div>}

            <form onSubmit={handleSubmit} className="register-form">
              <div className="register-form__row">
                <div className="login-field">
                  <label htmlFor="register-name">ชื่อ-นามสกุล</label>
                  <input id="register-name" name="name" type="text" value={name} onChange={(event) => setName(event.target.value)} required maxLength={100} autoComplete="name" placeholder="ชื่อที่ใช้ในบัญชี" />
                </div>
                <div className="login-field">
                  <label htmlFor="register-email">อีเมล</label>
                  <input id="register-email" name="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" placeholder="name@example.com" />
                </div>
              </div>

              <div className="register-password-grid">
                <div className="login-field">
                  <label htmlFor="register-password">รหัสผ่าน</label>
                  <div className="login-password">
                    <input id="register-password" name="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="new-password" placeholder="อย่างน้อย 8 ตัวอักษร" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'} aria-pressed={showPassword}>{showPassword ? <EyeOffIcon /> : <EyeIcon />}</button>
                  </div>
                </div>
                <div className="login-field">
                  <label htmlFor="register-confirm-password">ยืนยันรหัสผ่าน</label>
                  <div className={`login-password register-confirm${confirmPassword && confirmPassword !== password ? ' has-error' : ''}`}>
                    <input id="register-confirm-password" name="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required autoComplete="new-password" placeholder="พิมพ์รหัสผ่านอีกครั้ง" aria-describedby="register-confirm-status" />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} aria-label={showConfirmPassword ? 'ซ่อนรหัสผ่านยืนยัน' : 'แสดงรหัสผ่านยืนยัน'} aria-pressed={showConfirmPassword}>{showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}</button>
                  </div>
                  <div id="register-confirm-status" className={`register-confirm__status${confirmPassword && confirmPassword === password ? ' is-valid' : ''}`} aria-live="polite">{confirmPassword ? (confirmPassword === password ? 'รหัสผ่านตรงกัน' : 'รหัสผ่านไม่ตรงกัน') : ''}</div>
                </div>
              </div>

              <div className={`register-strength register-strength--${passwordStrength.score}`} aria-live="polite">
                <div className="register-strength__head"><span>ความแข็งแกร่งของรหัสผ่าน</span><strong>{password ? passwordStrength.label : 'ยังไม่ได้ระบุ'}</strong></div>
                <div className="register-strength__track" aria-hidden="true"><span style={{ width: `${passwordStrength.percentage}%` }} /></div>
                <ul>
                  <li className={passwordStrength.checks.length ? 'is-valid' : ''}>อย่างน้อย 8 ตัวอักษร</li>
                  <li className={passwordStrength.checks.uppercase ? 'is-valid' : ''}>มีตัวพิมพ์ใหญ่</li>
                  <li className={passwordStrength.checks.lowercase ? 'is-valid' : ''}>มีตัวพิมพ์เล็ก</li>
                  <li className={passwordStrength.checks.number ? 'is-valid' : ''}>มีตัวเลข</li>
                  <li className={passwordStrength.checks.special ? 'is-valid' : ''}>อักขระพิเศษ (แนะนำ)</li>
                </ul>
              </div>

              <button type="submit" className="login-submit" disabled={loading}>{loading ? 'กำลังสร้างบัญชี...' : 'สร้างบัญชีผู้เรียน'}</button>
            </form>

            <div className="login-divider"><span>หรือใช้บัญชี Google</span></div>
            <button type="button" onClick={() => signIn('google', { callbackUrl: '/dashboard' })} className="login-google">
              <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              สมัครด้วย Google
            </button>

            <p className="login-register">มีบัญชีอยู่แล้ว? <Link href="/login">เข้าสู่ระบบ</Link></p>
            <p className="login-privacy">เมื่อสร้างบัญชี คุณยอมรับข้อกำหนดการใช้งานและนโยบายความเป็นส่วนตัวของ MilerDev</p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
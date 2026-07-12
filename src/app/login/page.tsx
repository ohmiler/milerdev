'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  OAuthAccountNotLinked: 'อีเมลนี้มีบัญชีอยู่แล้ว กรุณาเข้าสู่ระบบด้วยรหัสผ่านก่อน แล้วจึงเชื่อมบัญชี Google ภายหลัง',
  AccessDenied: 'ไม่สามารถเข้าสู่ระบบได้ กรุณาลองใหม่อีกครั้ง',
  Configuration: 'ระบบเข้าสู่ระบบ Google ยังตั้งค่าไม่สมบูรณ์ กรุณาลองใหม่อีกครั้งภายหลัง',
  Verification: 'ลิงก์เข้าสู่ระบบไม่ถูกต้องหรือหมดอายุแล้ว',
  unauthorized: 'กรุณาเข้าสู่ระบบก่อนเข้าใช้งานหน้านี้',
};

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

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const errorCode = new URLSearchParams(window.location.search).get('error');
    if (!errorCode) return;

    setError(AUTH_ERROR_MESSAGES[errorCode] || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ กรุณาลองใหม่อีกครั้ง');
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
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
      <main className="login-shell">
        <div className="container login-shell__grid">
          <section className="login-context" aria-labelledby="login-context-title">
            <div className="login-context__brand">
              <Image src="/milerdev-logo-transparent.png" alt="" width={44} height={44} priority />
              <span>MilerDev Learning</span>
            </div>
            <div className="login-context__copy">
              <p className="login-context__meta">Return to learning</p>
              <h2 id="login-context-title">กลับมาเรียนต่อ<br />จากจุดที่คุณหยุดไว้</h2>
              <p>เข้าสู่ระบบเพื่อเปิดคอร์ส ดูความคืบหน้า และกลับไปยังบทเรียนถัดไปโดยไม่ต้องเริ่มค้นหาใหม่</p>
            </div>
            <ol className="login-context__steps">
              <li><span>01</span><p>เปิดคอร์สที่ลงทะเบียนไว้</p></li>
              <li><span>02</span><p>กลับไปยังบทเรียนล่าสุด</p></li>
              <li><span>03</span><p>ติดตาม progress และใบประกาศ</p></li>
            </ol>
          </section>

          <section className="login-panel" aria-labelledby="login-title">
            <div className="login-panel__head">
              <p className="login-panel__meta">Account access</p>
              <h1 id="login-title">เข้าสู่ระบบ</h1>
              <p>ใช้บัญชี MilerDev เพื่อกลับไปเรียนต่อ</p>
            </div>

            {error && <div className="login-error" role="alert">{error}</div>}

            <form onSubmit={handleSubmit} className="login-form">
              <div className="login-field">
                <label htmlFor="login-email">อีเมล</label>
                <input id="login-email" name="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" placeholder="name@example.com" />
              </div>

              <div className="login-field">
                <div className="login-field__label"><label htmlFor="login-password">รหัสผ่าน</label><Link href="/forgot-password">ลืมรหัสผ่าน?</Link></div>
                <div className="login-password">
                  <input id="login-password" name="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="current-password" placeholder="••••••••" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'} aria-pressed={showPassword}>{showPassword ? <EyeOffIcon /> : <EyeIcon />}</button>
                </div>
              </div>

              <button type="submit" className="login-submit" disabled={loading}>{loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}</button>
            </form>

            <div className="login-divider"><span>หรือใช้บัญชี Google</span></div>

            <button type="button" onClick={() => signIn('google', { callbackUrl: '/dashboard' })} className="login-google">
              <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              เข้าสู่ระบบด้วย Google
            </button>

            <p className="login-register">ยังไม่มีบัญชี? <Link href="/register">สมัครสมาชิกฟรี</Link></p>
            <p className="login-privacy">การเข้าสู่ระบบจะใช้ข้อมูลบัญชีตามนโยบายความเป็นส่วนตัวของ MilerDev</p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
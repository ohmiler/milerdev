'use client';

import { useState } from 'react';
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

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

      <main style={{ paddingTop: '64px', minHeight: '100vh', background: '#f8fafc' }}>
        <div className="container" style={{ paddingTop: '60px', paddingBottom: '60px' }}>
          <div style={{
            maxWidth: '440px',
            margin: '0 auto',
            background: 'white',
            borderRadius: '16px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
            padding: '40px',
          }}>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <h1 style={{
                fontSize: '1.75rem',
                fontWeight: 700,
                color: '#1e293b',
                marginBottom: '8px',
              }}>
                เข้าสู่ระบบ
              </h1>
              <p style={{ color: '#64748b' }}>
                ยินดีต้อนรับกลับมา! เข้าสู่ระบบเพื่อเรียนต่อ
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#dc2626',
                padding: '12px 16px',
                borderRadius: '8px',
                marginBottom: '24px',
                fontSize: '0.875rem',
              }}>
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: '#374151',
                  marginBottom: '8px',
                }}>
                  อีเมล
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="your@email.com"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    transition: 'border-color 0.2s',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: '#374151',
                  marginBottom: '8px',
                }}>
                  รหัสผ่าน
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    style={{
                      width: '100%',
                      padding: '12px 48px 12px 16px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      transition: 'border-color 0.2s',
                      outline: 'none',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#64748b',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                  >
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>

              <div style={{ textAlign: 'right', marginBottom: '24px' }}>
                <Link href="/forgot-password" style={{
                  color: '#2563eb',
                  fontSize: '0.875rem',
                  textDecoration: 'none',
                  fontWeight: 500,
                }}>
                  ลืมรหัสผ่าน?
                </Link>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  padding: '14px',
                  fontSize: '1rem',
                  opacity: loading ? 0.7 : 1,
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
              </button>
            </form>

            {/* Divider */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              margin: '32px 0',
            }}>
              <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
              <span style={{ color: '#94a3b8', fontSize: '0.875rem' }}>หรือ</span>
              <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
            </div>

            {/* Social Login */}
            <button
              onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
              style={{
                width: '100%',
                padding: '14px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                background: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                fontSize: '1rem',
                fontWeight: 500,
                color: '#374151',
                transition: 'background 0.2s',
              }}
            >
              <svg style={{ width: '20px', height: '20px' }} viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              เข้าสู่ระบบด้วย Google
            </button>

            {/* Register Link */}
            <p style={{
              textAlign: 'center',
              marginTop: '32px',
              color: '#64748b',
              fontSize: '0.9375rem',
            }}>
              ยังไม่มีบัญชี?{' '}
              <Link href="/register" style={{ color: '#2563eb', fontWeight: 500, textDecoration: 'none' }}>
                สมัครสมาชิก
              </Link>
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}

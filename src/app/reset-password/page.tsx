'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
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

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('รหัสผ่านไม่ตรงกัน');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
      });

      const data = await res.json();

      if (res.ok) {
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

  // No token provided
  if (!token) {
    return (
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: '64px',
          height: '64px',
          background: '#fef2f2',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px',
        }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </div>
        <h1 style={{
          fontSize: '1.5rem',
          fontWeight: 700,
          color: '#1e293b',
          marginBottom: '12px',
        }}>
          ลิงก์ไม่ถูกต้อง
        </h1>
        <p style={{ color: '#64748b', marginBottom: '24px' }}>
          ลิงก์รีเซ็ตรหัสผ่านไม่ถูกต้อง กรุณาขอลิงก์ใหม่
        </p>
        <Link href="/forgot-password" className="btn btn-primary" style={{
          display: 'inline-block',
          padding: '12px 24px',
          textDecoration: 'none',
        }}>
          ขอลิงก์รีเซ็ตใหม่
        </Link>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: '64px',
          height: '64px',
          background: '#dcfce7',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px',
        }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>
        <h1 style={{
          fontSize: '1.5rem',
          fontWeight: 700,
          color: '#1e293b',
          marginBottom: '12px',
        }}>
          ตั้งรหัสผ่านใหม่สำเร็จ!
        </h1>
        <p style={{ color: '#64748b', marginBottom: '32px' }}>
          คุณสามารถเข้าสู่ระบบด้วยรหัสผ่านใหม่ได้แล้ว
        </p>
        <Link href="/login" className="btn btn-primary" style={{
          display: 'inline-block',
          padding: '12px 24px',
          textDecoration: 'none',
        }}>
          ไปหน้าเข้าสู่ระบบ
        </Link>
      </div>
    );
  }

  // Form state
  return (
    <>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{
          width: '64px',
          height: '64px',
          background: '#eff6ff',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <h1 style={{
          fontSize: '1.5rem',
          fontWeight: 700,
          color: '#1e293b',
          marginBottom: '8px',
        }}>
          ตั้งรหัสผ่านใหม่
        </h1>
        <p style={{ color: '#64748b' }}>
          กรอกรหัสผ่านใหม่ที่คุณต้องการใช้
        </p>
      </div>

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

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: 500,
            color: '#374151',
            marginBottom: '8px',
          }}>
            รหัสผ่านใหม่
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              placeholder="••••••••"
              style={{
                width: '100%',
                padding: '12px 48px 12px 16px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '1rem',
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
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
          <p style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '6px' }}>
            อย่างน้อย 8 ตัวอักษร มีตัวพิมพ์ใหญ่ ตัวพิมพ์เล็ก และตัวเลข
          </p>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: 500,
            color: '#374151',
            marginBottom: '8px',
          }}>
            ยืนยันรหัสผ่านใหม่
          </label>
          <input
            type={showPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={8}
            placeholder="••••••••"
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '1rem',
              outline: 'none',
            }}
          />
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
          {loading ? 'กำลังบันทึก...' : 'ตั้งรหัสผ่านใหม่'}
        </button>
      </form>

      <p style={{
        textAlign: 'center',
        marginTop: '24px',
        color: '#64748b',
        fontSize: '0.9375rem',
      }}>
        <Link href="/login" style={{ color: '#2563eb', fontWeight: 500, textDecoration: 'none' }}>
          ← กลับไปหน้าเข้าสู่ระบบ
        </Link>
      </p>
    </>
  );
}

export default function ResetPasswordPage() {
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
            <Suspense fallback={
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <p style={{ color: '#64748b' }}>กำลังโหลด...</p>
              </div>
            }>
              <ResetPasswordForm />
            </Suspense>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}

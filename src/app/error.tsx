'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <main style={{ paddingTop: '0' }}>
      <section style={{
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #eff6ff 0%, #ffffff 50%, #f0f9ff 100%)',
        padding: '80px 0',
      }}>
        <div style={{ textAlign: 'center', maxWidth: '520px', padding: '0 1.5rem' }}>
          <div style={{
            width: '80px',
            height: '80px',
            background: 'linear-gradient(135deg, #fef2f2, #fee2e2)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
          }}>
            <svg style={{ width: '40px', height: '40px', color: '#ef4444' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>

          <h1 style={{
            fontSize: '1.75rem',
            fontWeight: 700,
            color: '#1e293b',
            marginBottom: '12px',
          }}>
            เกิดข้อผิดพลาด
          </h1>

          <p style={{
            fontSize: '1.1rem',
            color: '#64748b',
            lineHeight: 1.7,
            marginBottom: '32px',
          }}>
            ขออภัย เกิดข้อผิดพลาดที่ไม่คาดคิด
            กรุณาลองใหม่อีกครั้ง หรือกลับสู่หน้าหลัก
          </p>

          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => reset()}
              className="btn btn-primary"
              style={{ padding: '14px 28px', fontSize: '1.05rem' }}
            >
              <svg style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              ลองใหม่อีกครั้ง
            </button>
            <Link href="/" className="btn btn-secondary" style={{ padding: '14px 28px', fontSize: '1.05rem' }}>
              กลับหน้าหลัก
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

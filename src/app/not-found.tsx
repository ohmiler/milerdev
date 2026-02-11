import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

export default function NotFound() {
  return (
    <>
      <Navbar />
      <main style={{ paddingTop: '0' }}>
        <section style={{
          minHeight: '60vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #eff6ff 0%, #ffffff 50%, #f0f9ff 100%)',
          padding: '80px 0',
        }}>
          <div style={{ textAlign: 'center', maxWidth: '520px', padding: '0 1.5rem' }}>
            <div style={{
              fontSize: '8rem',
              fontWeight: 800,
              lineHeight: 1,
              background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '16px',
            }}>
              404
            </div>

            <h1 style={{
              fontSize: '1.75rem',
              fontWeight: 700,
              color: '#1e293b',
              marginBottom: '12px',
            }}>
              ไม่พบหน้าที่คุณต้องการ
            </h1>

            <p style={{
              fontSize: '1.1rem',
              color: '#64748b',
              lineHeight: 1.7,
              marginBottom: '32px',
            }}>
              หน้านี้อาจถูกย้าย ลบ หรือ URL ไม่ถูกต้อง
              กรุณาตรวจสอบ URL อีกครั้ง หรือกลับสู่หน้าหลัก
            </p>

            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/" className="btn btn-primary" style={{ padding: '14px 28px', fontSize: '1.05rem' }}>
                <svg style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                กลับหน้าหลัก
              </Link>
              <Link href="/courses" className="btn btn-secondary" style={{ padding: '14px 28px', fontSize: '1.05rem' }}>
                ดูคอร์สทั้งหมด
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

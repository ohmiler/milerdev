import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { db } from '@/lib/db';
import { certificates, users, courses } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ code: string }>;
}

async function getCertificate(code: string) {
  const [cert] = await db
    .select({
      id: certificates.id,
      certificateCode: certificates.certificateCode,
      recipientName: certificates.recipientName,
      courseTitle: certificates.courseTitle,
      completedAt: certificates.completedAt,
      issuedAt: certificates.issuedAt,
      revokedAt: certificates.revokedAt,
      userId: certificates.userId,
      courseId: certificates.courseId,
    })
    .from(certificates)
    .where(eq(certificates.certificateCode, code))
    .limit(1);

  if (!cert) return null;

  const [course] = await db
    .select({ slug: courses.slug })
    .from(courses)
    .where(eq(courses.id, cert.courseId))
    .limit(1);

  return { ...cert, courseSlug: course?.slug || null };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const cert = await getCertificate(code);
  if (!cert) return { title: 'ไม่พบใบรับรอง' };
  return {
    title: `ใบรับรอง - ${cert.recipientName}`,
    description: `ใบรับรองสำเร็จหลักสูตร "${cert.courseTitle}" โดย ${cert.recipientName}`,
  };
}

export default async function CertificatePage({ params }: Props) {
  const { code } = await params;
  const cert = await getCertificate(code);

  if (!cert) notFound();

  const isRevoked = !!cert.revokedAt;
  const completedDate = new Date(cert.completedAt).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const issuedDate = cert.issuedAt
    ? new Date(cert.issuedAt).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })
    : completedDate;

  return (
    <>
      <Navbar />
      <main style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #eff6ff 0%, #f8fafc 50%, #eff6ff 100%)' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '60px 16px 80px' }}>

          {/* Verification Status */}
          <div style={{
            textAlign: 'center',
            marginBottom: '32px',
          }}>
            {isRevoked ? (
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: '#fef2f2',
                color: '#dc2626',
                padding: '10px 24px',
                borderRadius: '24px',
                fontSize: '0.9375rem',
                fontWeight: 600,
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/></svg>
                ใบรับรองนี้ถูกเพิกถอนแล้ว
              </div>
            ) : (
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: '#f0fdf4',
                color: '#16a34a',
                padding: '10px 24px',
                borderRadius: '24px',
                fontSize: '0.9375rem',
                fontWeight: 600,
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>
                ใบรับรองนี้ถูกต้องและเป็นของจริง
              </div>
            )}
          </div>

          {/* Certificate Card */}
          <div style={{
            background: 'white',
            borderRadius: '24px',
            boxShadow: '0 4px 40px rgba(0,0,0,0.08)',
            overflow: 'hidden',
            border: isRevoked ? '2px solid #fecaca' : '2px solid #bfdbfe',
            opacity: isRevoked ? 0.7 : 1,
          }}>
            {/* Certificate Header - Blue Gradient */}
            <div style={{
              background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
              padding: '48px 40px 40px',
              textAlign: 'center',
              position: 'relative',
              overflow: 'hidden',
            }}>
              {/* Decorative circles */}
              <div style={{ position: 'absolute', top: '-30px', left: '-30px', width: '120px', height: '120px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
              <div style={{ position: 'absolute', bottom: '-40px', right: '-40px', width: '160px', height: '160px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />

              {/* Logo */}
              <div style={{
                width: '56px',
                height: '56px',
                background: 'white',
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
                fontSize: '1.5rem',
                fontWeight: 800,
                color: '#2563eb',
              }}>
                M
              </div>

              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', letterSpacing: '4px', textTransform: 'uppercase', marginBottom: '8px' }}>
                Certificate of Completion
              </p>
              <h1 style={{ color: 'white', fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>
                ใบรับรองสำเร็จหลักสูตร
              </h1>
            </div>

            {/* Certificate Body */}
            <div style={{ padding: '48px 40px', textAlign: 'center' }}>
              <p style={{ color: '#64748b', fontSize: '0.9375rem', marginBottom: '8px' }}>มอบให้แก่</p>
              <h2 style={{
                fontSize: '2rem',
                fontWeight: 700,
                color: '#1e293b',
                marginBottom: '32px',
                lineHeight: 1.3,
              }}>
                {cert.recipientName}
              </h2>

              <p style={{ color: '#64748b', fontSize: '0.9375rem', marginBottom: '8px' }}>สำเร็จหลักสูตร</p>
              <h3 style={{
                fontSize: '1.375rem',
                fontWeight: 600,
                color: '#2563eb',
                marginBottom: '32px',
                lineHeight: 1.4,
              }}>
                {cert.courseTitle}
              </h3>

              <div style={{ width: '80px', height: '2px', background: '#e2e8f0', margin: '0 auto 32px' }} />

              {/* Details */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '24px',
                maxWidth: '500px',
                margin: '0 auto',
              }}>
                <div>
                  <p style={{ color: '#94a3b8', fontSize: '0.8125rem', marginBottom: '4px' }}>วันที่สำเร็จ</p>
                  <p style={{ fontWeight: 600, color: '#334155' }}>{completedDate}</p>
                </div>
                <div>
                  <p style={{ color: '#94a3b8', fontSize: '0.8125rem', marginBottom: '4px' }}>วันที่ออกใบรับรอง</p>
                  <p style={{ fontWeight: 600, color: '#334155' }}>{issuedDate}</p>
                </div>
              </div>
            </div>

            {/* Certificate Footer */}
            <div style={{
              background: '#f8fafc',
              padding: '20px 40px',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
            }}>
              <div>
                <p style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: '2px' }}>รหัสใบรับรอง</p>
                <p style={{ fontFamily: 'monospace', fontWeight: 700, color: '#334155', fontSize: '0.9375rem' }}>
                  {cert.certificateCode}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: '2px' }}>ออกโดย</p>
                <p style={{ fontWeight: 600, color: '#334155', fontSize: '0.9375rem' }}>MilerDev</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div style={{ textAlign: 'center', marginTop: '32px', display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {cert.courseSlug && (
              <Link
                href={`/courses/${cert.courseSlug}`}
                style={{
                  padding: '12px 24px',
                  background: '#2563eb',
                  color: 'white',
                  borderRadius: '10px',
                  textDecoration: 'none',
                  fontWeight: 600,
                  fontSize: '0.9375rem',
                }}
              >
                ดูรายละเอียดคอร์ส
              </Link>
            )}
            <Link
              href="/courses"
              style={{
                padding: '12px 24px',
                background: 'white',
                color: '#334155',
                borderRadius: '10px',
                textDecoration: 'none',
                fontWeight: 500,
                fontSize: '0.9375rem',
                border: '1px solid #e2e8f0',
              }}
            >
              ดูคอร์สทั้งหมด
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

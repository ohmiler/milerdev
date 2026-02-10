import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import CertificateCard from '@/components/certificate/CertificateCard';
import { db } from '@/lib/db';
import { certificates, courses } from '@/lib/db/schema';
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

  return {
    ...cert,
    completedAt: cert.completedAt.toISOString(),
    issuedAt: cert.issuedAt ? cert.issuedAt.toISOString() : null,
    revokedAt: cert.revokedAt ? cert.revokedAt.toISOString() : null,
    courseSlug: course?.slug || null,
  };
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

  return (
    <>
      <Navbar />
      <main style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #eff6ff 0%, #f8fafc 50%, #eff6ff 100%)' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '60px 16px 80px' }}>

          {/* Verification Status */}
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            {isRevoked ? (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                background: '#fef2f2', color: '#dc2626', padding: '10px 24px',
                borderRadius: '24px', fontSize: '0.9375rem', fontWeight: 600,
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/></svg>
                ใบรับรองนี้ถูกเพิกถอนแล้ว
              </div>
            ) : (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                background: '#f0fdf4', color: '#16a34a', padding: '10px 24px',
                borderRadius: '24px', fontSize: '0.9375rem', fontWeight: 600,
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>
                ใบรับรองนี้ถูกต้องและเป็นของจริง
              </div>
            )}
          </div>

          <CertificateCard cert={cert} />
        </div>
      </main>
      <Footer />
    </>
  );
}

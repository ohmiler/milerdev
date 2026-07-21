import { cache } from 'react';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import CertificateCard from '@/components/certificate/CertificateCard';
import { db } from '@/lib/db';
import { certificates, courses } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import styles from '@/components/proof/proof.module.css';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ code: string }>;
}

const getCertificate = cache(async (code: string) => {
  const [cert] = await db
    .select({
      id: certificates.id,
      certificateCode: certificates.certificateCode,
      recipientName: certificates.recipientName,
      courseTitle: certificates.courseTitle,
      completedAt: certificates.completedAt,
      issuedAt: certificates.issuedAt,
      revokedAt: certificates.revokedAt,
      certificateTheme: certificates.certificateTheme,
      certificateHeaderImage: certificates.certificateHeaderImage,
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
    certificateTheme: cert.certificateTheme || null,
    certificateHeaderImage: cert.certificateHeaderImage || null,
    courseSlug: course?.slug || null,
  };
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const cert = await getCertificate(code);
  if (!cert) return { title: 'ไม่พบใบรับรอง' };

  const title = `ใบรับรอง - ${cert.recipientName}`;
  const description = `ใบรับรองสำเร็จหลักสูตร "${cert.courseTitle}" โดย ${cert.recipientName} จาก MilerDev`;

  return {
    title,
    description,
    alternates: {
      canonical: `/certificate/${code}`,
    },
    openGraph: {
      type: 'website',
      title,
      description,
      url: `/certificate/${code}`,
      siteName: 'MilerDev',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
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
      <main className={styles.publicCertificatePage}>
        <div className={`container ${styles.publicCertificateContainer}`}>
          <header className={styles.publicCertificateHeader}>
            <div>
              <p className={styles.eyebrow}>Credential verification</p>
              <h1>ตรวจสอบใบรับรอง</h1>
              <p>เอกสารสาธารณะสำหรับยืนยันผู้เรียน หลักสูตร วันที่สำเร็จ และสถานะใบรับรองจาก MilerDev</p>
            </div>
            <div
              className={`${styles.verificationState} ${isRevoked ? styles.verificationRevoked : styles.verificationValid}`}
              data-verification-status={isRevoked ? 'revoked' : 'valid'}
              role="status"
            >
              <span aria-hidden="true">{isRevoked ? '×' : '✓'}</span>
              <div>
                <p>{isRevoked ? 'REVOKED CREDENTIAL' : 'VERIFIED CREDENTIAL'}</p>
                <strong>{isRevoked ? 'ใบรับรองนี้ถูกเพิกถอนแล้ว' : 'ใบรับรองนี้ตรวจสอบได้'}</strong>
              </div>
            </div>
          </header>
          <CertificateCard cert={cert} />
        </div>
      </main>
      <Footer />
    </>
  );
}

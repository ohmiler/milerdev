import { cache } from 'react';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import CertificateCard from '@/components/certificate/CertificateCard';
import { db } from '@/lib/db';
import { certificates, courses } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

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
      <main className="min-h-screen bg-muted/20 py-10 sm:py-14">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <header className="mb-10 grid gap-6 border-b pb-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-end">
            <div>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">ตรวจสอบใบรับรอง</h1>
              <p className="mt-4 max-w-2xl leading-7 text-muted-foreground">เอกสารสาธารณะสำหรับยืนยันผู้เรียน หลักสูตร วันที่สำเร็จ และสถานะใบรับรองจาก MilerDev</p>
            </div>
            <Alert
              variant={isRevoked ? 'destructive' : 'default'}
              className={isRevoked ? undefined : 'border-emerald-500/40 bg-emerald-500/5 text-emerald-800'}
              data-verification-status={isRevoked ? 'revoked' : 'valid'}
            >
              <AlertTitle>{isRevoked ? '× REVOKED CREDENTIAL' : '✓ VERIFIED CREDENTIAL'}</AlertTitle>
              <AlertDescription>{isRevoked ? 'ใบรับรองนี้ถูกเพิกถอนแล้ว' : 'ใบรับรองนี้ตรวจสอบได้'}</AlertDescription>
            </Alert>
          </header>
          <CertificateCard cert={cert} />
        </div>
      </main>
      <Footer />
    </>
  );
}

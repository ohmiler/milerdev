import { cache } from 'react';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { BadgeCheck, CircleX } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import CertificateCard from '@/components/certificate/CertificateCard';
import { getPublicCertificateVerification } from '@/lib/certificate-credentials';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ code: string }>;
}

const getCertificate = cache(async (code: string) => {
  const result = await getPublicCertificateVerification(code);
  return result.kind === 'not_found' ? null : result.credential;
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
  const { code: certificateCode, ...certificateData } = cert;

  return (
    <>
      <Navbar />
      <main id="main-content" tabIndex={-1} className="min-h-screen bg-muted/20 py-10 sm:py-14">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <header className="mb-10 grid gap-6 border-b pb-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-end">
            <div>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">ตรวจสอบใบรับรอง</h1>
              <p className="mt-4 max-w-2xl leading-7 text-muted-foreground">เอกสารสาธารณะสำหรับยืนยันผู้เรียน หลักสูตร วันที่สำเร็จ และสถานะใบรับรองจาก MilerDev</p>
            </div>
            <Alert
              variant={isRevoked ? 'destructive' : 'default'}
              data-verification-status={isRevoked ? 'revoked' : 'valid'}
            >
              {isRevoked ? <CircleX aria-hidden="true" /> : <BadgeCheck aria-hidden="true" />}
              <AlertTitle>{isRevoked ? 'REVOKED CREDENTIAL' : 'VERIFIED CREDENTIAL'}</AlertTitle>
              <AlertDescription>{isRevoked ? 'ใบรับรองนี้ถูกเพิกถอนแล้ว' : 'ใบรับรองนี้ตรวจสอบได้'}</AlertDescription>
            </Alert>
          </header>
          <CertificateCard cert={{ ...certificateData, certificateCode }} />
        </div>
      </main>
      <Footer />
    </>
  );
}

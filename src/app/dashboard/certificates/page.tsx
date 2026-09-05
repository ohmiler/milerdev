import { requireMember } from '@/lib/member-access';
import type { Metadata } from 'next';
import LearnerAccountShell from '@/components/account/LearnerAccountShell';
import CertificateCollection from './CertificateCollection';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: 'ใบรับรองของฉัน',
  description: 'ดูและแชร์ใบรับรองจากคอร์สที่คุณเรียนจบ',
};

export default async function UserCertificatesPage() {
  await requireMember('/dashboard/certificates');
  return (
    <LearnerAccountShell
      current="certificates"
      title="ใบรับรองของฉัน"
      description="หลักฐานการเรียนจบที่ตรวจสอบได้ เปิดดูใบรับรองฉบับเต็มหรือคัดลอกลิงก์เพื่อแชร์ผลงานของคุณ"
    >
      <CertificateCollection />
    </LearnerAccountShell>
  );
}

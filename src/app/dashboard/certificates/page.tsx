import type { Metadata } from 'next';
import LearnerAccountShell from '@/components/account/LearnerAccountShell';
import CertificateCollection from './CertificateCollection';

export const metadata: Metadata = {
  title: 'ใบรับรองของฉัน',
  description: 'ดูและแชร์ใบรับรองจากคอร์สที่คุณเรียนจบ',
};

export default function UserCertificatesPage() {
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

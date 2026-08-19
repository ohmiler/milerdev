import type { Metadata } from 'next';
import LearnerAccountShell from '@/components/account/LearnerAccountShell';
import PaymentsClient from './PaymentsClient';

export const metadata: Metadata = {
  title: 'ประวัติการชำระเงิน',
  description: 'ตรวจสอบรายการและสถานะการชำระเงินสำหรับคอร์สเรียนของคุณ',
};

export default function UserPaymentsPage() {
  return (
    <LearnerAccountShell
      current="payments"
      eyebrow="ประวัติการชำระเงิน"
      title="ประวัติการชำระเงิน"
      description="ติดตามยอดชำระ วิธีชำระ และสถานะของทุกรายการที่เชื่อมกับบัญชีผู้เรียนของคุณ"
    >
      <PaymentsClient />
    </LearnerAccountShell>
  );
}

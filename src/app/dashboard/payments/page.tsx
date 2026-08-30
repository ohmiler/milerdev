import type { Metadata } from 'next';
import LearnerAccountShell from '@/components/account/LearnerAccountShell';
import PaymentHistory from './PaymentHistory';

export const metadata: Metadata = {
  title: 'ประวัติการชำระเงิน',
  description: 'ตรวจสอบรายการและสถานะการชำระเงินสำหรับคอร์สเรียนของคุณ',
};

export default function UserPaymentsPage() {
  return (
    <LearnerAccountShell
      current="payments"
      title="ประวัติการชำระเงิน"
      description="ติดตามยอดชำระ วิธีชำระ และสถานะของทุกรายการที่เชื่อมกับบัญชีผู้เรียนของคุณ"
    >
      <PaymentHistory />
    </LearnerAccountShell>
  );
}

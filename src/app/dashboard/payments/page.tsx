import type { Metadata } from 'next';
import LearnerAccountShell from '@/components/account/LearnerAccountShell';
import { requireMember } from '@/lib/member-access';
import PaymentHistory from './PaymentHistory';

export const metadata: Metadata = {
  title: 'ประวัติการชำระเงิน',
  description: 'ตรวจสอบรายการและสถานะการชำระเงินสำหรับคอร์สเรียนของคุณ',
};

export default async function UserPaymentsPage() {
  const member = await requireMember('/dashboard/payments');
  return (
    <LearnerAccountShell
      current="payments"
      title="ประวัติการชำระเงิน"
      description="ติดตามยอดชำระ วิธีชำระ และสถานะของทุกรายการที่เชื่อมกับบัญชีผู้เรียนของคุณ"
    >
      <PaymentHistory key={member.id} />
    </LearnerAccountShell>
  );
}

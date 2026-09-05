import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requireMember } from '@/lib/member-access';
import { loadPaymentRecord } from '@/lib/payment-records';
import TransactionReceipt from '@/components/proof/TransactionReceipt';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'รายละเอียดรายการชำระเงิน', robots: { index: false, follow: false } };

export default async function Page({ params }: { params: Promise<{ paymentId: string }> }) {
  const { paymentId } = await params;
  const member = await requireMember(`/dashboard/payments/${encodeURIComponent(paymentId)}`);
  const record = await loadPaymentRecord(member.id, paymentId);
  if (!record) notFound();
  return <TransactionReceipt record={record} />;
}

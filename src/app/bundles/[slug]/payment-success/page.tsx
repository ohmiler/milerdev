import type { Metadata } from 'next';
import PaymentReturnPage, { type PaymentReturnPageProps } from '@/components/proof/PaymentReturnPage';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'ตรวจสอบรายการชำระเงิน', robots: { index: false, follow: false } };

export default function Page(props: PaymentReturnPageProps) {
  return <PaymentReturnPage {...props} type="bundle" />;
}

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import MainContent from '@/components/layout/MainContent';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import type { PaymentRecord } from '@/lib/commerce/payment-records';
import type { LearningStart } from '@/lib/commerce/payment-return';
import PaymentRecordDetails from './PaymentRecordDetails';

export default function TransactionReceipt({ record, start }: { record: PaymentRecord; start?: LearningStart | null }) {
  // When the record card already offers "ไปการเรียนของฉัน", a second link to the same page is noise.
  const cardLinksDashboard = record.presentation.recovery.href === '/dashboard';
  return <>
    <Navbar />
    <MainContent className="min-h-screen bg-muted/20 py-10 sm:py-14">
      <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 sm:px-6">
        <header><h1 className="break-words text-3xl font-bold tracking-tight sm:text-4xl">{record.presentation.payment.heading}</h1></header>
        <PaymentRecordDetails record={record} />
        <nav aria-label="ติดตามรายการและสิทธิ์เรียน" className="flex flex-wrap gap-3">
          {start ? <Button asChild className="h-auto min-h-11 whitespace-normal"><Link href={start.href}>{start.label}<ArrowRight data-icon="inline-end" aria-hidden="true" /></Link></Button> : null}
          <Button asChild variant="outline" className="h-auto min-h-11 whitespace-normal"><Link href="/dashboard/payments">ประวัติการชำระเงินทั้งหมด</Link></Button>
          {cardLinksDashboard ? null : <Button asChild variant="outline" className="h-auto min-h-11 whitespace-normal"><Link href="/dashboard">การเรียนของฉัน</Link></Button>}
        </nav>
      </div>
    </MainContent>
    <Footer />
  </>;
}

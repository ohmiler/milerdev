import Link from 'next/link';
import type { PaymentRecord } from '@/lib/payment-records';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import PaymentRecoveryAction from './PaymentRecoveryAction';

const methodLabels = { promptpay: 'พร้อมเพย์', stripe: 'บัตรเครดิต/เดบิต (Stripe)', bank_transfer: 'โอนเงิน' };
const accessLabels = { none: 'ยังไม่มีสิทธิ์เรียน', partial: 'สิทธิ์เรียนพร้อมบางส่วน', ready: 'สิทธิ์เรียนพร้อมแล้ว' };

export default function PaymentRecordDetails({ record, onRefresh, showDetailsLink = false }: { record: PaymentRecord; onRefresh?: () => void; showDetailsLink?: boolean }) {
  const { presentation: p } = record;
  return <Card data-payment-state={p.payment.state} data-access={p.access.state}>
    <CardHeader className="min-w-0">
      <CardTitle className="break-words">{p.target.title || 'ไม่มีชื่อสินค้าในรายการเดิม'}</CardTitle>
      <CardDescription>{p.attempt?.createdAt ? new Date(p.attempt.createdAt).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }) + ' (เวลาไทย)' : 'ยังยืนยันวันเวลารายการไม่ได้'}</CardDescription>
    </CardHeader>
    <CardContent className="flex min-w-0 flex-col gap-4">
      <Badge variant={p.payment.state === 'failed' ? 'destructive' : 'outline'} className="h-auto max-w-full whitespace-normal">{p.payment.label}</Badge>
      <p className="text-sm leading-6 text-muted-foreground">{p.payment.description}</p>
      <dl className="grid gap-4 sm:grid-cols-2 [&_dt]:text-sm [&_dt]:text-muted-foreground [&_dd]:mt-1 [&_dd]:break-words">
        <div><dt>ยอดรายการ (THB)</dt><dd><strong>{p.quote?.amountFormatted ?? 'ยังยืนยันยอดไม่ได้'}</strong></dd></div>
        <div><dt>วิธีชำระเงิน</dt><dd>{p.attempt ? methodLabels[p.attempt.method] : 'ยังยืนยันวิธีชำระไม่ได้'}</dd></div>
        <div className="min-w-0 sm:col-span-2"><dt>เลขอ้างอิง</dt><dd className="font-mono [overflow-wrap:anywhere]">{p.attempt?.id ?? (record.id || 'ยังยืนยันเลขอ้างอิงไม่ได้')}</dd></div>
        <div><dt>สถานะสิทธิ์เรียน</dt><dd>{p.payment.state === 'unconfirmed' ? 'ตรวจสอบสิทธิ์ได้ในการเรียนของฉัน' : accessLabels[p.access.state]}</dd></div>
        {p.access.state === 'partial' ? <div><dt>คอร์สที่พร้อมเรียน</dt><dd>{p.access.enrolledCount} / {p.access.totalCount}</dd></div> : null}
      </dl>
    </CardContent>
    <CardFooter className="flex flex-wrap gap-3">
      <PaymentRecoveryAction record={record} onRefresh={onRefresh} />
      {p.recovery.kind !== 'contact' && ['completed-access-pending', 'verifying', 'unconfirmed'].includes(p.payment.state) ? <Button asChild variant="outline" className="h-auto min-h-11 whitespace-normal"><Link href="mailto:milerdev.official@gmail.com">ติดต่อพร้อมเลขอ้างอิง</Link></Button> : null}
      {showDetailsLink ? <Button asChild variant="outline" className="h-auto min-h-11 whitespace-normal"><Link href={`/dashboard/payments/${encodeURIComponent(record.id)}`}>รายละเอียดรายการ</Link></Button> : null}
    </CardFooter>
  </Card>;
}

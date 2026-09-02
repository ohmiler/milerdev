import MainContent from '@/components/layout/MainContent';
import Image from 'next/image';
import Link from 'next/link';
import { CircleCheck, Clock3 } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import RefreshAccessButton from './RefreshAccessButton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

interface ReceiptItem {
  id: string;
  title: string;
  href?: string;
}

interface TransactionReceiptProps {
  kind: 'course' | 'bundle';
  title: string;
  amount: string;
  orderId?: string | null;
  thumbnailUrl?: string | null;
  accessReady: boolean;
  primaryHref?: string;
  primaryLabel?: string;
  items?: ReceiptItem[];
}

function formatAmount(amount: string) {
  const value = Number.parseFloat(amount);
  return Number.isFinite(value)
    ? `฿${value.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`
    : amount;
}

function formatOrderId(orderId?: string | null) {
  if (!orderId) return 'รอสร้างเลขอ้างอิง';
  return orderId.length > 12 ? `${orderId.slice(0, 12).toUpperCase()}…` : orderId.toUpperCase();
}

export default function TransactionReceipt({
  kind,
  title,
  amount,
  orderId,
  thumbnailUrl,
  accessReady,
  primaryHref,
  primaryLabel,
  items = [],
}: TransactionReceiptProps) {
  const kindLabel = kind === 'bundle' ? 'ชุดคอร์ส' : 'คอร์สเรียน';

  return (
    <>
      <Navbar />
      <MainContent className="min-h-screen bg-muted/20 py-10 sm:py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <header className="grid gap-6 border-b pb-8 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-end">
            <div>
              <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">{accessReady ? 'ชำระเงินแล้ว พร้อมเริ่มเรียน' : 'กำลังยืนยันสิทธิ์การเรียน'}</h1>
              <p className="mt-4 max-w-2xl leading-7 text-muted-foreground">
                {accessReady
                  ? 'รายการนี้ผ่านการยืนยันและสิทธิ์เรียนถูกเพิ่มในบัญชีของคุณแล้ว'
                  : 'ระบบได้รับรายการแล้ว แต่สิทธิ์เรียนยังไม่พร้อม กรุณาตรวจสอบสถานะอีกครั้งก่อนเริ่มเรียน'}
              </p>
            </div>
            <Card><CardContent className="grid gap-1 p-4 lg:text-right"><span className="text-xs font-semibold text-muted-foreground">เลขอ้างอิง</span><strong className="break-all font-mono text-sm text-primary">{formatOrderId(orderId)}</strong></CardContent></Card>
          </header>

          <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <Card className="overflow-hidden" aria-labelledby="receipt-product-title">
              <div className="flex justify-between gap-4 border-b px-6 py-4 text-sm font-semibold text-muted-foreground">
                <span>รายการสั่งซื้อ</span>
                <span>{kind === 'bundle' ? `${items.length} คอร์ส` : '1 คอร์ส'}</span>
              </div>

              <div className="grid border-b sm:grid-cols-[14rem_minmax(0,1fr)]">
                <div className="relative min-h-52 bg-slate-950">
                  {thumbnailUrl ? (
                    <Image src={thumbnailUrl} alt="" fill sizes="(max-width: 680px) 100vw, 220px" />
                  ) : (
                    <div className="flex h-full min-h-52 items-center justify-center text-4xl font-bold text-white" aria-hidden="true">MD</div>
                  )}
                </div>
                <div className="flex flex-col justify-center p-6 sm:p-8">
                  <p className="text-sm font-semibold text-muted-foreground">{kindLabel}</p>
                  <h2 className="mt-3 text-2xl font-semibold tracking-tight" id="receipt-product-title">{title}</h2>
                  <strong className="mt-6 text-xl text-primary">{formatAmount(amount)}</strong>
                </div>
              </div>

              {items.length > 0 && (
                <div className="border-b p-6">
                  <p className="mb-3 text-sm font-semibold text-primary">คอร์สในชุดนี้</p>
                  <ol className="divide-y border-y">
                    {items.map((item, index) => (
                      <li className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3 py-3 text-sm" key={item.id}>
                        <span className="text-muted-foreground">{String(index + 1).padStart(2, '0')}</span>
                        {item.href ? <Link href={item.href}>{item.title}</Link> : <span>{item.title}</span>}
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              <dl className="grid bg-muted/40 sm:grid-cols-3 [&_div]:p-5 [&_dt]:text-xs [&_dt]:text-muted-foreground [&_dd]:mt-2 [&_dd]:break-words [&_dd]:font-semibold">
                <div><dt>ยอดรายการ</dt><dd>{formatAmount(amount)}</dd></div>
                <div><dt>สถานะสิทธิ์</dt><dd>{accessReady ? 'พร้อมเรียน' : 'กำลังยืนยัน'}</dd></div>
                <div><dt>เลขอ้างอิง</dt><dd>{formatOrderId(orderId)}</dd></div>
              </dl>
            </Card>

            <Card className="h-fit overflow-hidden lg:sticky lg:top-24" aria-label="ขั้นตอนถัดไป">
              <CardHeader>
              <div
                className="grid gap-3"
                data-access={accessReady ? 'ready' : 'pending'}
                role="status"
              >
                <Badge variant="outline" className="w-fit">
                  {accessReady ? <CircleCheck data-icon="inline-start" aria-hidden="true" /> : <Clock3 data-icon="inline-start" aria-hidden="true" />}
                  {accessReady ? 'พร้อมเข้าเรียน' : 'กำลังตรวจสอบสิทธิ์'}
                </Badge>
                <CardTitle>{accessReady ? 'คอร์สอยู่ในบัญชีแล้ว' : 'ยังไม่ควรเริ่มเรียน'}</CardTitle>
                <p className="text-sm leading-6 text-muted-foreground">
                  {accessReady
                    ? 'เปิดบทเรียนได้ทันที หรือกลับไปดูภาพรวมการเรียนทั้งหมดใน Dashboard'
                    : 'อย่าชำระเงินซ้ำ ระบบอาจใช้เวลาสั้น ๆ ในการยืนยันและเพิ่มสิทธิ์เรียน'}
                </p>
              </div>
              </CardHeader>

              <CardContent className="grid gap-3 p-6">
                {accessReady && primaryHref && primaryLabel ? (
                  <Button asChild>
                    <Link href={primaryHref}>{primaryLabel}<span aria-hidden="true">→</span></Link>
                  </Button>
                ) : (
                  <RefreshAccessButton />
                )}
                <Button asChild variant="outline">
                  <Link href="/dashboard">ไปยัง Dashboard</Link>
                </Button>
              </CardContent>

              <CardFooter className="block border-t text-sm text-muted-foreground"><p>ต้องการความช่วยเหลือเกี่ยวกับรายการนี้?</p><a className="font-medium text-primary" href="mailto:milerdev.official@gmail.com">milerdev.official@gmail.com</a></CardFooter>
            </Card>
          </div>
        </div>
      </MainContent>
      <Footer />
    </>
  );
}

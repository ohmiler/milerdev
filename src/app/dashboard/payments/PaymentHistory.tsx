'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ComponentProps } from 'react';
import { CircleAlert, CreditCard, ReceiptText } from 'lucide-react';
import Link from 'next/link';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';

interface Payment {
  id: string;
  amount: string;
  currency: string;
  method: string;
  status: string;
  createdAt: string;
  courseId: string | null;
  courseTitle: string | null;
  courseSlug: string | null;
  bundleId: string | null;
  bundleTitle: string | null;
  bundleSlug: string | null;
}

const methodLabels: Record<string, string> = {
  promptpay: 'พร้อมเพย์',
  stripe: 'บัตรเครดิต/เดบิต',
  bank_transfer: 'โอนเงิน',
};

type BadgeVariant = ComponentProps<typeof Badge>['variant'];

const statusConfig: Record<string, { label: string; variant: BadgeVariant }> = {
  completed: { label: 'สำเร็จ', variant: 'secondary' },
  pending: { label: 'รอดำเนินการ', variant: 'outline' },
  verifying: { label: 'กำลังตรวจสอบ', variant: 'default' },
  failed: { label: 'ไม่สำเร็จ', variant: 'destructive' },
  refunded: { label: 'คืนเงินแล้ว', variant: 'secondary' },
};

const ZERO_SATANG = BigInt(0);
const SATANG_PER_BAHT = BigInt(100);

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function parseThbSatang(amount: string) {
  const match = /^([+-]?)(\d+)(?:\.(\d{1,2}))?$/.exec(amount.trim());
  if (!match) return null;

  const sign = match[1] === '-' ? -BigInt(1) : BigInt(1);
  const baht = BigInt(match[2]);
  const satang = BigInt((match[3] ?? '').padEnd(2, '0'));
  return sign * ((baht * SATANG_PER_BAHT) + satang);
}

function formatThbSatang(value: bigint) {
  const isNegative = value < ZERO_SATANG;
  const absoluteValue = isNegative ? -value : value;
  const baht = absoluteValue / SATANG_PER_BAHT;
  const satang = (absoluteValue % SATANG_PER_BAHT).toString().padStart(2, '0');
  const formattedBaht = new Intl.NumberFormat('th-TH').format(baht);
  return `${isNegative ? '-' : ''}${formattedBaht}.${satang}`;
}

function formatAmount(amount: string, currency: string) {
  if (currency === 'THB') {
    const satang = parseThbSatang(amount);
    if (satang !== null) return `฿${formatThbSatang(satang)}`;
  }

  const value = Number.parseFloat(amount);
  if (!Number.isFinite(value)) return `${amount} ${currency}`;
  return `${value.toLocaleString('th-TH', { minimumFractionDigits: 2 })} ${currency}`;
}

export default function PaymentHistory() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const retry = useCallback(() => setReloadKey((key) => key + 1), []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadPayments() {
      setLoading(true);
      setError(false);

      try {
        const response = await fetch('/api/payments', { signal: controller.signal });
        if (!response.ok) throw new Error('Payment request failed');
        const data = await response.json();
        setPayments(Array.isArray(data.payments) ? data.payments : []);
      } catch (requestError) {
        if (requestError instanceof DOMException && requestError.name === 'AbortError') return;
        setError(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadPayments();
    return () => controller.abort();
  }, [reloadKey]);

  const completed = payments.filter((payment) => payment.status === 'completed');
  const totalSpentSatang = completed.reduce((sum, payment) => {
    if (payment.currency !== 'THB') return sum;
    return sum + (parseThbSatang(payment.amount) ?? ZERO_SATANG);
  }, ZERO_SATANG);

  if (loading) {
    return (
      <Card aria-live="polite" aria-busy="true">
        <CardHeader>
          <CardTitle>กำลังโหลดรายการชำระเงิน</CardTitle>
          <CardDescription>ระบบกำลังดึงประวัติจากบัญชีของคุณ</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-1/2" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <CircleAlert aria-hidden="true" />
        <AlertTitle>ยังดึงรายการชำระเงินไม่ได้</AlertTitle>
        <AlertDescription>
          <p>ตรวจสอบการเชื่อมต่อหรือสถานะการเข้าสู่ระบบ แล้วลองโหลดข้อมูลอีกครั้ง</p>
          <Button className="mt-4" type="button" variant="destructive" onClick={retry}>ลองใหม่</Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (payments.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon"><CreditCard aria-hidden="true" /></EmptyMedia>
          <EmptyTitle>ยังไม่มีประวัติการชำระเงิน</EmptyTitle>
          <EmptyDescription>เมื่อคุณชำระเงินสำหรับคอร์สหรือชุดคอร์ส รายการและสถานะจะปรากฏที่นี่</EmptyDescription>
        </EmptyHeader>
        <EmptyContent><Button asChild><Link href="/courses">เลือกคอร์สเรียน</Link></Button></EmptyContent>
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="grid gap-4 sm:grid-cols-3" aria-label="สรุปการชำระเงิน">
        <Card size="sm"><CardHeader><CardDescription>รายการทั้งหมด</CardDescription><CardTitle>{payments.length}</CardTitle></CardHeader></Card>
        <Card size="sm"><CardHeader><CardDescription>ชำระสำเร็จ</CardDescription><CardTitle>{completed.length}</CardTitle></CardHeader></Card>
        <Card size="sm"><CardHeader><CardDescription>ยอดชำระสำเร็จ</CardDescription><CardTitle>฿{formatThbSatang(totalSpentSatang)}</CardTitle></CardHeader></Card>
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="payment-records-title">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <Badge variant="outline">ประวัติการชำระเงิน</Badge>
            <h2 id="payment-records-title" className="font-heading text-xl font-semibold">รายการล่าสุด</h2>
          </div>
          <p className="text-sm text-muted-foreground">{payments.length} รายการ</p>
        </div>

        <div className="grid gap-3">
          {payments.map((payment, index) => {
            const status = statusConfig[payment.status] ?? statusConfig.pending;
            const title = payment.courseTitle ?? payment.bundleTitle;
            const href = payment.courseSlug
              ? `/courses/${payment.courseSlug}`
              : payment.bundleSlug ? `/bundles/${payment.bundleSlug}` : null;

            return (
              <Card size="sm" key={payment.id}>
                <CardHeader>
                  <CardTitle>
                    {title && href ? <Link href={href}>{title}</Link> : title ?? 'รายการนี้ไม่มีหน้าสินค้าแล้ว'}
                  </CardTitle>
                  <CardDescription>
                    {String(index + 1).padStart(2, '0')} · {methodLabels[payment.method] ?? payment.method} · {formatDate(payment.createdAt)}
                  </CardDescription>
                  <CardAction><Badge variant={status.variant}>{status.label}</Badge></CardAction>
                </CardHeader>
                <CardContent className="flex items-center gap-2">
                  <ReceiptText aria-hidden="true" />
                  <strong>{formatAmount(payment.amount, payment.currency)}</strong>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import { CircleAlert, CreditCard } from 'lucide-react';
import Link from 'next/link';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
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
import PaymentRecordDetails from '@/components/proof/PaymentRecordDetails';
import type { PaymentRecord } from '@/lib/payment-records';

const ZERO_SATANG = BigInt(0);
const SATANG_PER_BAHT = BigInt(100);

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

export default function PaymentHistory() {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
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
        const response = await fetch('/api/payments', { signal: controller.signal, cache: 'no-store' });
        if (!response.ok) throw new Error('Payment request failed');
        const data = await response.json();
        if (!controller.signal.aborted) setPayments(Array.isArray(data.payments) ? data.payments : []);
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

  const completed = payments.filter((payment) => payment.presentation.payment.isConfirmed);
  const totalSpentSatang = completed.reduce((sum, payment) => {
    if (!payment.presentation.quote) return sum;
    return sum + (parseThbSatang(payment.presentation.quote.amountDue) ?? ZERO_SATANG);
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
          {payments.map((record) => <PaymentRecordDetails key={record.id} record={record} onRefresh={retry} showDetailsLink />)}
        </div>
      </section>
    </div>
  );
}

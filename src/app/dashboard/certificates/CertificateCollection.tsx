'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Award, CircleAlert, Copy } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import type { OwnerCertificateCollection } from '@/lib/certificate-credentials';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function CertificateCollection() {
  const [collection, setCollection] = useState<OwnerCertificateCollection | null>(null);
  const [repairing, setRepairing] = useState<string | null>(null);
  const repairBusy = useRef(false);
  const [recoveryMessage, setRecoveryMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const retry = useCallback(() => setReloadKey((key) => key + 1), []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadCertificates() {
      setLoading(true);
      setError(false);

      try {
        const response = await fetch('/api/certificates', { signal: controller.signal });
        if (!response.ok) throw new Error('Certificate request failed');
        const data = await response.json();
        if (!data.collection || !Array.isArray(data.collection.items)) throw new Error('Invalid collection');
        setCollection(data.collection);
      } catch (requestError) {
        if (requestError instanceof DOMException && requestError.name === 'AbortError') return;
        setError(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadCertificates();
    return () => controller.abort();
  }, [reloadKey]);

  async function copyCertificateLink(code: string) {
    try {
      const url = `${window.location.origin}/certificate/${code}`;
      await navigator.clipboard.writeText(url);
      toast.success('คัดลอกลิงก์ใบรับรองแล้ว');
    } catch {
      toast.error('ไม่สามารถคัดลอกลิงก์ได้', {
        description: 'กรุณาเปิดใบรับรองแล้วคัดลอกที่อยู่จากเบราว์เซอร์',
      });
    }
  }

  async function repair(courseSlug: string) {
    if (repairBusy.current) return;
    repairBusy.current = true;
    setRepairing(courseSlug);
    setRecoveryMessage('');
    try {
      const response = await fetch('/api/certificates/repair', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ courseSlug }),
      });
      const data = await response.json();
      const kind = data.result?.kind;
      if (response.ok && (kind === 'issued' || kind === 'ready')) {
        setRecoveryMessage('ตรวจสอบใบรับรองสำเร็จ'); retry();
      } else if (kind === 'revoked') {
        setRecoveryMessage('ใบรับรองถูกเพิกถอนแล้ว กรุณาติดต่อทีมงาน'); retry();
      } else if (kind === 'not_completed') {
        setRecoveryMessage('ยังไม่พบข้อมูลเรียนจบ กรุณากลับไปตรวจสอบการเรียน');
      } else {
        setRecoveryMessage(response.status === 429 ? 'ตรวจสอบถี่เกินไป กรุณารอสักครู่แล้วลองใหม่' : 'ยังออกใบรับรองไม่ได้ กรุณาลองใหม่หรือติดต่อทีมงาน');
      }
    } catch {
      setRecoveryMessage('ยังยืนยันผลไม่ได้ กรุณาโหลดข้อมูลอีกครั้งก่อนลองใหม่');
    } finally {
      repairBusy.current = false; setRepairing(null);
    }
  }

  if (loading) {
    return (
      <Card aria-live="polite" aria-busy="true">
        <CardHeader>
          <CardTitle>กำลังโหลดใบรับรอง</CardTitle>
          <CardDescription>ระบบกำลังตรวจสอบใบรับรองในบัญชีของคุณ</CardDescription>
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
        <AlertTitle>ยังดึงใบรับรองไม่ได้</AlertTitle>
        <AlertDescription>
          <p>ตรวจสอบการเชื่อมต่อหรือสถานะการเข้าสู่ระบบ แล้วลองโหลดข้อมูลอีกครั้ง</p>
          <Button className="mt-4" type="button" variant="destructive" onClick={retry}>ลองใหม่</Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!collection || collection.items.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon"><Award aria-hidden="true" /></EmptyMedia>
          <EmptyTitle>ยังไม่มีใบรับรอง</EmptyTitle>
          <EmptyDescription>เรียนบทเรียนให้ครบตามเงื่อนไขของคอร์ส แล้วใบรับรองที่ออกให้จะถูกรวมไว้ที่นี่</EmptyDescription>
        </EmptyHeader>
        <EmptyContent><Button asChild><Link href={collection?.summary.hasEnrollment ? "/dashboard" : "/courses"}>{collection?.summary.hasEnrollment ? "กลับไปเรียนต่อ" : "เลือกคอร์สเรียน"}</Link></Button></EmptyContent>
      </Empty>
    );
  }

  return (
    <section className="flex flex-col gap-4" aria-labelledby="certificate-records-title">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Badge variant="outline">ใบรับรองที่ตรวจสอบได้</Badge>
          <h2 id="certificate-records-title" className="font-heading text-xl font-semibold">ใบรับรองทั้งหมด</h2>
        </div>
        <p className="text-sm text-muted-foreground">{collection.summary.activeCount} ใช้งานได้ · {collection.summary.revokedCount} เพิกถอน · {collection.summary.missingCount} รอใบรับรอง</p>
      </div>

      {recoveryMessage && <Alert role="status"><AlertDescription>{recoveryMessage}</AlertDescription></Alert>}
      <div className="grid gap-3">
        {collection.items.map((certificate, index) => (
          <Card size="sm" key={certificate.kind === 'missing' ? certificate.courseSlug : certificate.code}>
            <CardHeader>
              <CardTitle>{certificate.courseTitle}</CardTitle>
              <CardDescription>
                {String(index + 1).padStart(2, '0')} · เรียนจบ {formatDate(certificate.completedAt)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Badge variant={certificate.kind === 'revoked' ? 'destructive' : 'secondary'}>{certificate.kind === 'active' ? 'ใช้งานได้' : certificate.kind === 'revoked' ? 'เพิกถอนแล้ว' : 'เรียนจบแล้ว ยังไม่มีใบรับรอง'}</Badge>
              {certificate.kind !== 'missing' && <p className="mt-2 break-all text-sm">{certificate.code}</p>}
            </CardContent>
            <CardFooter className="flex-wrap gap-2">
              {certificate.kind === 'missing' ? (
                <Button type="button" disabled={repairing !== null} aria-busy={repairing === certificate.courseSlug} onClick={() => void repair(certificate.courseSlug)}>
                  {repairing === certificate.courseSlug ? 'กำลังตรวจสอบ...' : 'ตรวจสอบและออกใบรับรอง'}
                </Button>
              ) : (
                <>
                  <Button asChild><Link href={`/certificate/${certificate.code}`}>ตรวจสอบใบรับรอง</Link></Button>
                  {certificate.kind === 'active' && <Button variant="outline" type="button" onClick={() => void copyCertificateLink(certificate.code)} aria-label={`คัดลอกลิงก์ใบรับรอง ${certificate.courseTitle}`}>
                    <Copy data-icon="inline-start" aria-hidden="true" />คัดลอกลิงก์
                  </Button>}
                </>
              )}
              {certificate.kind === 'revoked' || certificate.kind === 'missing' ? <Button asChild variant="outline"><Link href="/contact">ติดต่อทีมงาน</Link></Button> : null}
            </CardFooter>
          </Card>
        ))}
      </div>
    </section>
  );
}

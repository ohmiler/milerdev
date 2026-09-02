'use client';

import { useCallback, useEffect, useState } from 'react';
import { Award, CircleAlert, Copy } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

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

interface Certificate {
  id: string;
  certificateCode: string;
  recipientName: string;
  courseTitle: string;
  completedAt: string;
  issuedAt: string;
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function CertificateCollection() {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
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
        setCertificates(Array.isArray(data.certificates) ? data.certificates : []);
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

  async function copyCertificateLink(certificate: Certificate) {
    try {
      const url = `${window.location.origin}/certificate/${certificate.certificateCode}`;
      await navigator.clipboard.writeText(url);
      toast.success('คัดลอกลิงก์ใบรับรองแล้ว');
    } catch {
      toast.error('ไม่สามารถคัดลอกลิงก์ได้', {
        description: 'กรุณาเปิดใบรับรองแล้วคัดลอกที่อยู่จากเบราว์เซอร์',
      });
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

  if (certificates.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon"><Award aria-hidden="true" /></EmptyMedia>
          <EmptyTitle>ยังไม่มีใบรับรอง</EmptyTitle>
          <EmptyDescription>เรียนบทเรียนให้ครบตามเงื่อนไขของคอร์ส แล้วใบรับรองที่ออกให้จะถูกรวมไว้ที่นี่</EmptyDescription>
        </EmptyHeader>
        <EmptyContent><Button asChild><Link href="/courses">เลือกคอร์สเรียน</Link></Button></EmptyContent>
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
        <p className="text-sm text-muted-foreground">{certificates.length} ใบ</p>
      </div>

      <div className="grid gap-3">
        {certificates.map((certificate, index) => (
          <Card size="sm" key={certificate.id}>
            <CardHeader>
              <CardTitle>{certificate.courseTitle}</CardTitle>
              <CardDescription>
                {String(index + 1).padStart(2, '0')} · เรียนจบ {formatDate(certificate.completedAt)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Badge variant="secondary">{certificate.certificateCode}</Badge>
            </CardContent>
            <CardFooter className="flex-wrap gap-2">
              <Button asChild>
                <Link href={`/certificate/${certificate.certificateCode}`}>ดูใบรับรอง</Link>
              </Button>
              <Button
                variant="outline"
                type="button"
                onClick={() => void copyCertificateLink(certificate)}
                aria-label={`คัดลอกลิงก์ใบรับรอง ${certificate.courseTitle}`}
              >
                <Copy data-icon="inline-start" aria-hidden="true" />
                คัดลอกลิงก์
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </section>
  );
}

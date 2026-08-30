'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { RotateCcw } from 'lucide-react';
import StatusSurface from '@/components/status/StatusSurface';
import { Button } from '@/components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <StatusSurface
      code="ERR"
      routeLabel="App / Recovery"
      title="หน้านี้ทำงานต่อไม่ได้"
      description="เกิดข้อผิดพลาดที่ไม่คาดคิดระหว่างเปิดหน้านี้ คุณสามารถลองประมวลผลอีกครั้งหรือกลับไปเริ่มจากหน้าหลัก"
      note="รายละเอียดทางเทคนิคถูกเก็บไว้สำหรับการตรวจสอบและจะไม่แสดงบนหน้านี้"
    >
      <Button type="button" onClick={reset}>
        <RotateCcw data-icon="inline-start" aria-hidden="true" />
        ลองใหม่อีกครั้ง
      </Button>
      <Button asChild variant="outline">
        <Link href="/">กลับหน้าหลัก</Link>
      </Button>
    </StatusSurface>
  );
}

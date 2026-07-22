'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import StatusSurface from '@/components/status/StatusSurface';

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
      eyebrow="ระบบหยุดทำงานชั่วคราว"
      title="หน้านี้ทำงานต่อไม่ได้"
      description="เกิดข้อผิดพลาดที่ไม่คาดคิดระหว่างเปิดหน้านี้ คุณสามารถลองประมวลผลอีกครั้งหรือกลับไปเริ่มจากหน้าหลัก"
      note="รายละเอียดทางเทคนิคถูกเก็บไว้สำหรับการตรวจสอบและจะไม่แสดงบนหน้านี้"
    >
      <button type="button" onClick={reset}>ลองใหม่อีกครั้ง <span aria-hidden="true">↻</span></button>
      <Link href="/">กลับหน้าหลัก</Link>
    </StatusSurface>
  );
}

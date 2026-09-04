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
      code={'ERR'}
      routeLabel={'App / Recovery'}
      title={'เกิดข้อผิดพลาด'}
      description={'หน้านี้ทำงานต่อไม่ได้ในขณะนี้ ลองประมวลผลอีกครั้งเพื่อทำงานเดิมต่อ หรือกลับไปเริ่มจากหน้าแรก'}
      note={'รายละเอียดทางเทคนิคถูกเก็บไว้สำหรับการตรวจสอบและจะไม่แสดงบนหน้านี้'}
    >
      <Button type={'button'} onClick={reset}>
        <RotateCcw data-icon={'inline-start'} aria-hidden={true} />
        ลองใหม่อีกครั้ง
      </Button>
      <Button asChild variant={'outline'}>
        <Link href={'/'}>กลับหน้าแรก</Link>
      </Button>
    </StatusSurface>
  );
}

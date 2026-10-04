'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { RotateCcw } from 'lucide-react';
import { AdminErrorState } from '@/components/admin/ui/AdminOperations';
import { Button } from '@/components/ui/button';

// Keeps a failing admin page inside the admin layout, so the sidebar stays usable.
export default function AdminError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error('Admin page error:', error);
  }, [error]);

  return (
    <AdminErrorState
      title="หน้านี้ทำงานต่อไม่ได้"
      description="เกิดข้อผิดพลาดระหว่างแสดงหน้านี้ ลองโหลดใหม่ หรือกลับไปที่ภาพรวม รายละเอียดทางเทคนิคถูกบันทึกไว้และไม่แสดงบนหน้านี้"
      action={(
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" onClick={() => retry()}>
            <RotateCcw data-icon="inline-start" aria-hidden />
            ลองใหม่อีกครั้ง
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/admin">กลับไปภาพรวม</Link>
          </Button>
        </div>
      )}
    />
  );
}

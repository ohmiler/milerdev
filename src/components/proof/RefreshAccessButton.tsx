'use client';

import { Button } from '@/components/ui/button';

export default function RefreshAccessButton() {
  return (
    <Button type="button" onClick={() => window.location.reload()}>
      ตรวจสอบสถานะอีกครั้ง
    </Button>
  );
}

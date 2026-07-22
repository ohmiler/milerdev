import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-helpers';

// Payment attempts are immutable financial records. Retention or archival must
// use an explicit, separately reviewed policy instead of deleting rows in bulk.
export async function DELETE() {
  const authResult = await requireAdmin();
  if (authResult instanceof NextResponse) return authResult;

  return NextResponse.json(
    { error: 'ไม่อนุญาตให้ลบประวัติการชำระเงิน กรุณาใช้สถานะเพื่อจัดการรายการ' },
    { status: 405, headers: { Allow: 'GET' } },
  );
}

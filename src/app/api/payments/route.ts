import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { loadPaymentRecords } from '@/lib/payment-records';

const headers = { 'Cache-Control': 'private, no-store' };

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers });
    return NextResponse.json({ payments: await loadPaymentRecords(session.user.id) }, { headers });
  } catch {
    return NextResponse.json({ error: 'ยังตรวจสอบรายการไม่ได้ กรุณาลองใหม่' }, { status: 503, headers });
  }
}

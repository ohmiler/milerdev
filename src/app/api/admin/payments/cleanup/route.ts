import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { payments } from '@/lib/db/schema';
import { eq, and, lte, sql } from 'drizzle-orm';
import { logAudit } from '@/lib/auditLog';

// DELETE /api/admin/payments/cleanup - Clean up stale pending payments (older than 24 hours)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function DELETE(_request: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

    // Count before deleting
    const [countResult] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(payments)
      .where(and(eq(payments.status, 'pending'), lte(payments.createdAt, cutoff)));

    const staleCount = countResult?.count || 0;

    if (staleCount === 0) {
      return NextResponse.json({ message: 'ไม่มีรายการ pending ที่ค้างเกิน 24 ชั่วโมง', deleted: 0 });
    }

    // Delete stale pending payments
    await db
      .delete(payments)
      .where(and(eq(payments.status, 'pending'), lte(payments.createdAt, cutoff)));

    await logAudit({
      userId: session.user.id,
      action: 'delete',
      entityType: 'payment',
      entityId: 'bulk-cleanup',
      newValue: `Cleaned up ${staleCount} stale pending payments (older than 24h)`,
    });

    return NextResponse.json({
      message: `ลบรายการ pending ที่ค้างเกิน 24 ชั่วโมง สำเร็จ`,
      deleted: staleCount,
    });
  } catch (error) {
    console.error('Error cleaning up payments:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด' },
      { status: 500 }
    );
  }
}

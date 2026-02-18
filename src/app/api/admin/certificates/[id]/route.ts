import { NextResponse } from 'next/server';
import { logError } from '@/lib/error-handler';
import { requireAdmin } from '@/lib/auth-helpers';
import { db } from '@/lib/db';
import { certificates } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { logAudit } from '@/lib/auditLog';

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/admin/certificates/[id] - Get single certificate
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const authResult = await requireAdmin();
    if (authResult instanceof NextResponse) return authResult;
    const { session } = authResult;

    const { id } = await params;
    const [cert] = await db.select().from(certificates).where(eq(certificates.id, id)).limit(1);

    if (!cert) {
      return NextResponse.json({ error: 'ไม่พบใบรับรอง' }, { status: 404 });
    }

    return NextResponse.json({ certificate: cert });
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), { action: 'Error fetching certificate:' });
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}

// PUT /api/admin/certificates/[id] - Revoke or restore certificate
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const authResult = await requireAdmin();
    if (authResult instanceof NextResponse) return authResult;
    const { session } = authResult;

    const { id } = await params;
    const { action, reason } = await request.json();

    const [cert] = await db.select().from(certificates).where(eq(certificates.id, id)).limit(1);
    if (!cert) {
      return NextResponse.json({ error: 'ไม่พบใบรับรอง' }, { status: 404 });
    }

    if (action === 'revoke') {
      await db.update(certificates).set({
        revokedAt: new Date(),
        revokedReason: reason || null,
      }).where(eq(certificates.id, id));
      await logAudit({ userId: session.user.id, action: 'update', entityType: 'certificate', entityId: id, newValue: `revoked: ${reason || 'no reason'}` });
      return NextResponse.json({ message: 'เพิกถอนใบรับรองสำเร็จ' });
    } else if (action === 'restore') {
      await db.update(certificates).set({
        revokedAt: null,
        revokedReason: null,
      }).where(eq(certificates.id, id));
      await logAudit({ userId: session.user.id, action: 'update', entityType: 'certificate', entityId: id, newValue: 'restored' });
      return NextResponse.json({ message: 'คืนสถานะใบรับรองสำเร็จ' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), { action: 'Error updating certificate:' });
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}

// DELETE /api/admin/certificates/[id] - Delete certificate
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const authResult = await requireAdmin();
    if (authResult instanceof NextResponse) return authResult;
    const { session } = authResult;

    const { id } = await params;
    await db.delete(certificates).where(eq(certificates.id, id));
    await logAudit({ userId: session.user.id, action: 'delete', entityType: 'certificate', entityId: id });
    return NextResponse.json({ message: 'ลบใบรับรองสำเร็จ' });
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), { action: 'Error deleting certificate:' });
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}

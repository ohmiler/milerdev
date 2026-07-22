import { NextResponse } from 'next/server';
import { logError } from '@/lib/error-handler';
import { requireAdmin } from '@/lib/auth-helpers';
import { db } from '@/lib/db';
import { auditLogs, payments, enrollments, bundleCourses, courses, bundles } from '@/lib/db/schema';
import { eq, and, ne, sql } from 'drizzle-orm';
import { z } from 'zod';
import { notify } from '@/lib/notify';
import { fulfillManualPayment } from '@/lib/payment-fulfillment';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/admin/payments/[id] - Get single payment
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const authResult = await requireAdmin();
    if (authResult instanceof NextResponse) return authResult;

    const { id } = await params;

    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.id, id))
      .limit(1);

    if (!payment) {
      return NextResponse.json({ error: 'ไม่พบรายการชำระเงิน' }, { status: 404 });
    }

    return NextResponse.json({ payment });
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), { action: 'Error fetching payment:' });
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด' },
      { status: 500 }
    );
  }
}

// Payment attempts are immutable financial history and cannot be hard-deleted.
export async function DELETE() {
  const authResult = await requireAdmin();
  if (authResult instanceof NextResponse) return authResult;

  return NextResponse.json(
    { error: 'ไม่อนุญาตให้ลบประวัติการชำระเงิน กรุณาเปลี่ยนสถานะแทน' },
    { status: 405, headers: { Allow: 'GET, PUT' } },
  );
}

const paymentStatusActionSchema = z.object({
  status: z.enum(['completed', 'failed', 'refunded']),
  reason: z.string().trim().min(5).max(500),
}).strict();

class PaymentStatusConflict extends Error {}

function getAffectedRows(result: unknown): number | null {
  const candidate = Array.isArray(result) ? result[0] : result;
  if (!candidate || typeof candidate !== 'object' || !('affectedRows' in candidate)) return null;
  const affectedRows = Number((candidate as { affectedRows: unknown }).affectedRows);
  return Number.isFinite(affectedRows) ? affectedRows : null;
}

// PUT /api/admin/payments/[id] - Update payment status
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const authResult = await requireAdmin();
    if (authResult instanceof NextResponse) return authResult;
    const { session } = authResult;

    const { id } = await params;
    const parsedBody = paymentStatusActionSchema.safeParse(
      await request.json().catch(() => null),
    );
    if (!parsedBody.success) {
      return NextResponse.json(
        { error: 'กรุณาระบุสถานะและเหตุผลอย่างน้อย 5 ตัวอักษร' },
        { status: 400 },
      );
    }
    const { status, reason } = parsedBody.data;

    // Get existing payment
    const [existingPayment] = await db
      .select()
      .from(payments)
      .where(eq(payments.id, id))
      .limit(1);

    if (!existingPayment) {
      return NextResponse.json({ error: 'ไม่พบรายการชำระเงิน' }, { status: 404 });
    }

    const previousStatus = existingPayment.status;

    if (previousStatus === status) {
      return NextResponse.json({
        message: 'สถานะไม่มีการเปลี่ยนแปลง',
        previousStatus,
        newStatus: status,
      });
    }
    if (previousStatus === 'refunded') {
      return NextResponse.json({ error: 'รายการ refunded เป็นสถานะสิ้นสุดและเปิดใช้งานใหม่ไม่ได้' }, { status: 400 });
    }
    if (status === 'completed' && existingPayment.method === 'stripe') {
      return NextResponse.json({ error: 'Stripe payments must be completed by verified Stripe fulfillment' }, { status: 400 });
    }
    if (status === 'failed' && previousStatus !== 'pending' && previousStatus !== 'verifying') {
      return NextResponse.json({ error: `Cannot mark ${previousStatus} payment as failed` }, { status: 400 });
    }
    if (status === 'refunded' && previousStatus !== 'completed') {
      return NextResponse.json({ error: 'Only completed payments can be refunded' }, { status: 400 });
    }

    let enrolledCount = 0;
    if (status === 'completed') {
      const result = await fulfillManualPayment({
        paymentId: id,
        actorId: session.user.id,
        reason,
      });
      if (result.status === 'rejected') {
        const responseStatus = result.code === 'PAYMENT_STATE_RACE' ? 409 : 400;
        return NextResponse.json({ error: result.code }, { status: responseStatus });
      }
      enrolledCount = result.enrolledCount;
    } else {
      // Status mutation and any entitlement revocation must commit together.
      await db.transaction(async (tx) => {
        const updateResult = await tx
          .update(payments)
          .set({ status })
          .where(and(eq(payments.id, id), eq(payments.status, previousStatus)));
        if (getAffectedRows(updateResult) !== 1) throw new PaymentStatusConflict(id);

        // Revoke access only when no other completed payment still grants it.
        if (status === 'refunded' && previousStatus === 'completed' && existingPayment.userId) {
        const courseIdsToCheck: string[] = [];

        if (existingPayment.bundleId) {
          const bCourses = await tx
            .select({ courseId: bundleCourses.courseId })
            .from(bundleCourses)
            .where(eq(bundleCourses.bundleId, existingPayment.bundleId));
          courseIdsToCheck.push(...bCourses.map(bc => bc.courseId));
        } else if (existingPayment.courseId) {
          courseIdsToCheck.push(existingPayment.courseId);
        }

        for (const courseId of courseIdsToCheck) {
          // Check 1: another completed direct course payment
          const [directPayment] = await tx
            .select({ count: sql<number>`count(*)` })
            .from(payments)
            .where(and(
              eq(payments.userId, existingPayment.userId!),
              eq(payments.courseId, courseId),
              eq(payments.status, 'completed'),
              ne(payments.id, id)
            ));

          // Check 2: another completed bundle payment that includes this course
          const [bundlePayment] = await tx
            .select({ count: sql<number>`count(*)` })
            .from(payments)
            .innerJoin(bundleCourses, eq(payments.bundleId, bundleCourses.bundleId))
            .where(and(
              eq(payments.userId, existingPayment.userId!),
              eq(bundleCourses.courseId, courseId),
              eq(payments.status, 'completed'),
              ne(payments.id, id)
            ));

          const hasOtherEntitlement = (directPayment?.count || 0) > 0 || (bundlePayment?.count || 0) > 0;
          if (!hasOtherEntitlement) {
            await tx.delete(enrollments).where(
              and(eq(enrollments.userId, existingPayment.userId!), eq(enrollments.courseId, courseId))
            );
          }
        }
        }

        await tx.insert(auditLogs).values({
          userId: session.user.id,
          action: 'update',
          entityType: 'payment',
          entityId: id,
          oldValue: `status: ${previousStatus}`,
          newValue: `status: ${status}; reason: ${reason}`,
        });
      });
    }

    // Send notification when payment is completed (non-blocking)
    if (status === 'completed' && previousStatus !== 'completed' && existingPayment.userId) {
      (async () => {
        let itemName = 'รายการ';
        if (existingPayment.courseId) {
          const [c] = await db.select({ title: courses.title }).from(courses).where(eq(courses.id, existingPayment.courseId)).limit(1);
          if (c) itemName = c.title;
        } else if (existingPayment.bundleId) {
          const [b] = await db.select({ title: bundles.title }).from(bundles).where(eq(bundles.id, existingPayment.bundleId)).limit(1);
          if (b) itemName = b.title;
        }
        await notify({
          userId: existingPayment.userId!,
          title: '✅ ชำระเงินสำเร็จ',
          message: `การชำระเงินสำหรับ "${itemName}" ได้รับการยืนยันแล้ว`,
          type: 'success',
          link: '/dashboard',
        });
      })().catch(err => console.error('Failed to send payment notification:', err));
    }

    return NextResponse.json({ 
      message: 'อัพเดทสถานะสำเร็จ',
      previousStatus,
      newStatus: status,
      ...(status === 'completed' && { enrolled: enrolledCount }),
    });
  } catch (error) {
    if (error instanceof PaymentStatusConflict) {
      return NextResponse.json(
        { error: 'สถานะรายการถูกเปลี่ยนไปแล้ว กรุณาโหลดข้อมูลใหม่' },
        { status: 409 },
      );
    }
    logError(error instanceof Error ? error : new Error(String(error)), { action: 'Error updating payment:' });
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด กรุณาลองใหม่' },
      { status: 500 }
    );
  }
}


import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { auditLogs, bundles, courses, payments, users } from '@/lib/db/schema';
import { sendEnrollmentEmail, sendPaymentConfirmation } from '@/lib/email';
import { fulfillManualPayment } from '@/lib/payment-fulfillment';
import { notify } from '@/lib/notify';

const MAX_RETRIES = 5;

const reconciliationActionSchema = z.object({
  action: z.enum(['approve', 'reject']),
  reason: z.string().trim().min(5).max(500),
}).strict();

class ReconciliationConflict extends Error {}

function getAffectedRows(result: unknown): number | null {
  const candidate = Array.isArray(result) ? result[0] : result;
  if (!candidate || typeof candidate !== 'object' || !('affectedRows' in candidate)) return null;
  const affectedRows = Number((candidate as { affectedRows: unknown }).affectedRows);
  return Number.isFinite(affectedRows) ? affectedRows : null;
}

// POST /api/admin/reconciliation/[paymentId]/retry
export async function POST(
  request: Request,
  { params }: { params: Promise<{ paymentId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const parsedBody = reconciliationActionSchema.safeParse(
      await request.json().catch(() => null),
    );
    if (!parsedBody.success) {
      return NextResponse.json(
        { error: 'กรุณาระบุ action และเหตุผลอย่างน้อย 5 ตัวอักษร' },
        { status: 400 },
      );
    }

    const { paymentId } = await params;
    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.id, paymentId))
      .limit(1);

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }
    if (payment.method !== 'promptpay') {
      return NextResponse.json(
        { error: 'Only PromptPay payments can be reconciled manually' },
        { status: 400 },
      );
    }
    if (payment.status !== 'verifying' && payment.status !== 'failed') {
      return NextResponse.json(
        { error: `Cannot reconcile payment with status: ${payment.status}` },
        { status: 400 },
      );
    }
    if ((payment.retryCount ?? 0) >= MAX_RETRIES) {
      return NextResponse.json(
        { error: `Maximum retries (${MAX_RETRIES}) reached` },
        { status: 400 },
      );
    }

    const { action, reason } = parsedBody.data;
    if (action === 'reject') {
      await db.transaction(async (tx) => {
        const updateResult = await tx
          .update(payments)
          .set({
            status: 'failed',
            retryCount: (payment.retryCount ?? 0) + 1,
            lastRetryAt: new Date(),
          })
          .where(and(eq(payments.id, payment.id), eq(payments.status, payment.status)));
        if (getAffectedRows(updateResult) !== 1) throw new ReconciliationConflict(payment.id);
        await tx.insert(auditLogs).values({
          userId: session.user.id,
          action: 'update',
          entityType: 'payment',
          entityId: payment.id,
          oldValue: `status: ${payment.status}`,
          newValue: `status: failed; reconciliation rejected; reason: ${reason}`,
        });
      });

      return NextResponse.json({
        success: true,
        message: 'Payment marked as failed',
        status: 'failed',
      });
    }

    const result = await fulfillManualPayment({
      paymentId: payment.id,
      allowedMethod: 'promptpay',
      actorId: session.user.id,
      reason,
    });
    if (result.status === 'rejected') {
      const status = result.code === 'PAYMENT_STATE_RACE' ? 409 : 400;
      return NextResponse.json({ error: result.code }, { status });
    }

    sendApprovalMessages(payment).catch((error) => {
      console.error('Failed to send reconciliation confirmation:', error);
    });

    return NextResponse.json({
      success: true,
      message: 'Payment approved and entitlement reconciled',
      status: 'completed',
      enrolled: result.enrolledCount,
    });
  } catch (error) {
    if (error instanceof ReconciliationConflict) {
      return NextResponse.json(
        { error: 'สถานะรายการถูกเปลี่ยนไปแล้ว กรุณาโหลดข้อมูลใหม่' },
        { status: 409 },
      );
    }
    console.error('Error reconciling payment:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}

async function sendApprovalMessages(payment: typeof payments.$inferSelect) {
  if (!payment.userId) return;

  const [user] = await db
    .select({ email: users.email, name: users.name })
    .from(users)
    .where(eq(users.id, payment.userId))
    .limit(1);

  if (payment.courseId) {
    const [course] = await db
      .select({ title: courses.title, slug: courses.slug })
      .from(courses)
      .where(eq(courses.id, payment.courseId))
      .limit(1);
    const courseName = course?.title ?? 'คอร์ส';

    await Promise.all([
      notify({
        userId: payment.userId,
        title: '✅ ชำระเงินสำเร็จ',
        message: `การชำระเงินสำหรับ "${courseName}" ได้รับการยืนยันแล้ว`,
        type: 'success',
        link: '/dashboard',
      }),
      ...(course && user?.email && user.name ? [
        sendPaymentConfirmation({
          email: user.email,
          name: user.name,
          courseName: course.title,
          amount: Number(payment.amount),
          paymentId: payment.id,
        }),
        sendEnrollmentEmail({
          email: user.email,
          name: user.name,
          courseName: course.title,
          courseSlug: course.slug,
        }),
      ] : []),
    ]);
    return;
  }

  if (payment.bundleId) {
    const [bundle] = await db
      .select({ title: bundles.title })
      .from(bundles)
      .where(eq(bundles.id, payment.bundleId))
      .limit(1);
    await notify({
      userId: payment.userId,
      title: '✅ ชำระเงินสำเร็จ',
      message: `การชำระเงินสำหรับ "${bundle?.title ?? 'Bundle'}" ได้รับการยืนยันแล้ว`,
      type: 'success',
      link: '/dashboard',
    });
  }
}

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-helpers';
import { db } from '@/lib/db';
import { payments, enrollments, bundleCourses, courses, bundles } from '@/lib/db/schema';
import { eq, and, ne, sql } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { logAudit } from '@/lib/auditLog';
import { notify } from '@/lib/notify';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/admin/payments/[id] - Get single payment
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const authResult = await requireAdmin();
    if (authResult instanceof NextResponse) return authResult;
    const { session } = authResult;

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
    console.error('Error fetching payment:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/payments/[id] - Delete payment
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const authResult = await requireAdmin();
    if (authResult instanceof NextResponse) return authResult;
    const { session } = authResult;

    const { id } = await params;

    const [existing] = await db
      .select()
      .from(payments)
      .where(eq(payments.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: 'ไม่พบรายการชำระเงิน' }, { status: 404 });
    }

    await db.delete(payments).where(eq(payments.id, id));

    await logAudit({ userId: session.user.id, action: 'delete', entityType: 'payment', entityId: id, oldValue: `status: ${existing.status}` });

    return NextResponse.json({ message: 'ลบรายการชำระเงินสำเร็จ' });
  } catch (error) {
    console.error('Error deleting payment:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด กรุณาลองใหม่' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/payments/[id] - Update payment status
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const authResult = await requireAdmin();
    if (authResult instanceof NextResponse) return authResult;
    const { session } = authResult;

    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    if (!status || !['pending', 'completed', 'failed', 'refunded'].includes(status)) {
      return NextResponse.json({ error: 'สถานะไม่ถูกต้อง' }, { status: 400 });
    }

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

    // Wrap status update + enrollment changes in a transaction for atomicity
    await db.transaction(async (tx) => {
      // Update payment status
      await tx
        .update(payments)
        .set({ status })
        .where(eq(payments.id, id));

      // If status changed to 'completed', create enrollment
      if (status === 'completed' && previousStatus !== 'completed' && existingPayment.userId) {
        if (existingPayment.bundleId) {
          const bCourses = await tx
            .select({ courseId: bundleCourses.courseId })
            .from(bundleCourses)
            .where(eq(bundleCourses.bundleId, existingPayment.bundleId));

          for (const bc of bCourses) {
            const [existing] = await tx
              .select()
              .from(enrollments)
              .where(and(eq(enrollments.userId, existingPayment.userId!), eq(enrollments.courseId, bc.courseId)))
              .limit(1);
            if (!existing) {
              await tx.insert(enrollments).values({
                id: createId(),
                userId: existingPayment.userId!,
                courseId: bc.courseId,
                enrolledAt: new Date(),
                progressPercent: 0,
              });
            }
          }
        } else if (existingPayment.courseId) {
          const [existingEnrollment] = await tx
            .select()
            .from(enrollments)
            .where(
              and(
                eq(enrollments.userId, existingPayment.userId!),
                eq(enrollments.courseId, existingPayment.courseId)
              )
            )
            .limit(1);

          if (!existingEnrollment) {
            await tx.insert(enrollments).values({
              id: createId(),
              userId: existingPayment.userId!,
              courseId: existingPayment.courseId,
              enrolledAt: new Date(),
              progressPercent: 0,
            });
          }
        }
      }

      // If status changed to 'refunded' from 'completed', remove enrollment
      // BUT only if user has no other completed payment for the same course
      // This checks BOTH direct course payments AND other bundle payments that include the course
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
    });

    await logAudit({ userId: session.user.id, action: 'update', entityType: 'payment', entityId: id, oldValue: `status: ${previousStatus}`, newValue: `status: ${status}` });

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
    });
  } catch (error) {
    console.error('Error updating payment:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด กรุณาลองใหม่' },
      { status: 500 }
    );
  }
}

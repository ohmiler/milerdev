import { NextResponse } from 'next/server';
import { logError } from '@/lib/error-handler';
import { and, eq } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth-helpers';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { payments, enrollments, courses, bundles, bundleCourses, users } from '@/lib/db/schema';
import { createId } from '@paralleldrive/cuid2';
import { sendPaymentConfirmation, sendEnrollmentEmail } from '@/lib/email';
import { trackAnalyticsEvent } from '@/lib/analytics';
import { notify } from '@/lib/notify';

const MAX_RETRIES = 5;

// POST /api/admin/reconciliation/[paymentId]/retry
export async function POST(
    request: Request,
    { params }: { params: Promise<{ paymentId: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { paymentId } = await params;

        // Get payment
        const [payment] = await db
            .select()
            .from(payments)
            .where(eq(payments.id, paymentId))
            .limit(1);

        if (!payment) {
            return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
        }

        if (payment.status !== 'verifying' && payment.status !== 'failed') {
            return NextResponse.json(
                { error: `Cannot retry payment with status: ${payment.status}` },
                { status: 400 }
            );
        }

        if ((payment.retryCount || 0) >= MAX_RETRIES) {
            return NextResponse.json(
                { error: `Maximum retries (${MAX_RETRIES}) reached` },
                { status: 400 }
            );
        }

        if (payment.method !== 'promptpay') {
            return NextResponse.json(
                { error: 'Only PromptPay payments can be retried' },
                { status: 400 }
            );
        }

        // Get the body for manual approval or slip re-verify
        const body = await request.json().catch(() => ({}));
        const action = body.action || 'approve';

        if (action === 'approve') {
            // Admin manually approves the payment
            return await handleManualApproval(payment, session.user);
        } else if (action === 'reject') {
            // Admin manually rejects the payment
            await db.update(payments).set({
                status: 'failed',
                retryCount: (payment.retryCount || 0) + 1,
                lastRetryAt: new Date(),
            }).where(eq(payments.id, payment.id));

            return NextResponse.json({
                success: true,
                message: 'Payment marked as failed',
                status: 'failed',
            });
        }

        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    } catch (error) {
        console.error('Error retrying payment:', error);
        return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
    }
}

async function handleManualApproval(
    payment: typeof payments.$inferSelect,
    adminUser: { id: string; email?: string | null; name?: string | null }
) {
    const isBundlePayment = !!payment.bundleId;

    if (isBundlePayment) {
        return await approveBundlePayment(payment, adminUser);
    } else {
        return await approveCoursePayment(payment, adminUser);
    }
}

async function approveCoursePayment(
    payment: typeof payments.$inferSelect,
    adminUser: { id: string }
) {
    if (!payment.courseId || !payment.userId) {
        return NextResponse.json({ error: 'Missing courseId or userId' }, { status: 400 });
    }

    // Check if already enrolled
    const existing = await db.query.enrollments.findFirst({
        where: and(
            eq(enrollments.userId, payment.userId),
            eq(enrollments.courseId, payment.courseId)
        ),
    });

    if (existing) {
        // Already enrolled, just mark completed
        await db.update(payments).set({
            status: 'completed',
            retryCount: (payment.retryCount || 0) + 1,
            lastRetryAt: new Date(),
        }).where(eq(payments.id, payment.id));

        return NextResponse.json({
            success: true,
            message: 'Payment approved (user already enrolled)',
            status: 'completed',
        });
    }

    // Approve: update payment + enroll in transaction
    await db.transaction(async (tx) => {
        await tx.update(payments).set({
            status: 'completed',
            retryCount: (payment.retryCount || 0) + 1,
            lastRetryAt: new Date(),
        }).where(eq(payments.id, payment.id));

        await tx.insert(enrollments).values({
            id: createId(),
            userId: payment.userId!,
            courseId: payment.courseId!,
        });
    });

    // Track analytics
    await trackAnalyticsEvent({
        eventName: 'payment_success',
        userId: payment.userId,
        courseId: payment.courseId,
        paymentId: payment.id,
        source: 'server',
        metadata: {
            itemType: 'course',
            paymentMethod: 'promptpay',
            amount: parseFloat(payment.amount),
            reconciledBy: adminUser.id,
        },
    });

    // Send emails (non-blocking, best-effort)
    const [course] = await db.select().from(courses).where(eq(courses.id, payment.courseId!)).limit(1);
    const [user] = await db.select().from(users).where(eq(users.id, payment.userId!)).limit(1);
    if (course && user?.email && user?.name) {
        Promise.all([
            sendPaymentConfirmation({
                email: user.email,
                name: user.name,
                courseName: course.title,
                amount: parseFloat(payment.amount),
                paymentId: payment.id,
            }),
            sendEnrollmentEmail({
                email: user.email,
                name: user.name,
                courseName: course.title,
                courseSlug: course.slug,
            }),
        ]).catch((err) => console.error('Failed to send reconciliation emails:', err));
    }

    // Send in-app notification (non-blocking)
    if (payment.userId) {
        const courseName = course?.title || 'คอร์ส';
        notify({
            userId: payment.userId,
            title: '✅ ชำระเงินสำเร็จ',
            message: `การชำระเงินสำหรับ "${courseName}" ได้รับการยืนยันแล้ว`,
            type: 'success',
            link: '/dashboard',
        }).catch(err => console.error('Failed to send payment notification:', err));
    }

    return NextResponse.json({
        success: true,
        message: 'Payment approved and user enrolled',
        status: 'completed',
    });
}

async function approveBundlePayment(
    payment: typeof payments.$inferSelect,
    adminUser: { id: string }
) {
    if (!payment.bundleId || !payment.userId) {
        return NextResponse.json({ error: 'Missing bundleId or userId' }, { status: 400 });
    }

    // Get courses in bundle
    const bCourses = await db
        .select({ courseId: bundleCourses.courseId })
        .from(bundleCourses)
        .where(eq(bundleCourses.bundleId, payment.bundleId));

    if (bCourses.length === 0) {
        return NextResponse.json({ error: 'Bundle has no courses' }, { status: 400 });
    }

    const enrolled: string[] = [];
    await db.transaction(async (tx) => {
        await tx.update(payments).set({
            status: 'completed',
            retryCount: (payment.retryCount || 0) + 1,
            lastRetryAt: new Date(),
        }).where(eq(payments.id, payment.id));

        for (const bc of bCourses) {
            const existing = await tx.query.enrollments.findFirst({
                where: and(
                    eq(enrollments.userId, payment.userId!),
                    eq(enrollments.courseId, bc.courseId)
                ),
            });

            if (!existing) {
                await tx.insert(enrollments).values({
                    id: createId(),
                    userId: payment.userId!,
                    courseId: bc.courseId,
                });
                enrolled.push(bc.courseId);
            }
        }
    });

    // Track analytics
    await trackAnalyticsEvent({
        eventName: 'payment_success',
        userId: payment.userId,
        bundleId: payment.bundleId,
        paymentId: payment.id,
        source: 'server',
        metadata: {
            itemType: 'bundle',
            paymentMethod: 'promptpay',
            amount: parseFloat(payment.amount),
            reconciledBy: adminUser.id,
        },
    });

    // Send in-app notification (non-blocking)
    if (payment.userId) {
        const [bundle] = await db.select({ title: bundles.title }).from(bundles).where(eq(bundles.id, payment.bundleId)).limit(1);
        const bundleName = bundle?.title || 'Bundle';
        notify({
            userId: payment.userId,
            title: '✅ ชำระเงินสำเร็จ',
            message: `การชำระเงินสำหรับ "${bundleName}" ได้รับการยืนยันแล้ว`,
            type: 'success',
            link: '/dashboard',
        }).catch(err => console.error('Failed to send bundle payment notification:', err));
    }

    return NextResponse.json({
        success: true,
        message: `Payment approved and enrolled in ${enrolled.length} courses`,
        status: 'completed',
        enrolled,
    });
}

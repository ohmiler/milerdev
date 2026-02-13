import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { bundles, bundleCourses, courses, enrollments, payments } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { sendEnrollmentEmail } from '@/lib/email';
import { checkRateLimit, rateLimits, rateLimitResponse } from '@/lib/rate-limit';
import { safeInsertEnrollment } from '@/lib/db/safe-insert';

// POST /api/bundles/enroll - Enroll in all courses of a bundle
export async function POST(request: Request) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const rateLimit = checkRateLimit(`enroll:${session.user.id}`, rateLimits.sensitive);
        if (!rateLimit.success) {
            return rateLimitResponse(rateLimit.resetTime);
        }

        const body = await request.json();
        const { bundleId, paymentId } = body;

        if (!bundleId) {
            return NextResponse.json({ error: 'Bundle ID is required' }, { status: 400 });
        }

        // Get bundle
        const [bundle] = await db.select().from(bundles).where(eq(bundles.id, bundleId)).limit(1);
        if (!bundle || bundle.status !== 'published') {
            return NextResponse.json({ error: 'Bundle not found' }, { status: 404 });
        }

        const bundlePrice = parseFloat(bundle.price);

        // If paid bundle, verify payment
        if (bundlePrice > 0 && paymentId) {
            const [payment] = await db
                .select()
                .from(payments)
                .where(
                    and(
                        eq(payments.id, paymentId),
                        eq(payments.userId, session.user.id),
                        eq(payments.bundleId, bundleId),
                        eq(payments.status, 'completed')
                    )
                )
                .limit(1);

            if (!payment) {
                return NextResponse.json({ error: 'Valid payment required' }, { status: 402 });
            }
        } else if (bundlePrice > 0) {
            return NextResponse.json({ error: 'Payment required for this bundle' }, { status: 402 });
        }

        // Get courses in bundle
        const bCourses = await db
            .select({
                courseId: bundleCourses.courseId,
                courseTitle: courses.title,
                courseSlug: courses.slug,
            })
            .from(bundleCourses)
            .innerJoin(courses, eq(bundleCourses.courseId, courses.id))
            .where(eq(bundleCourses.bundleId, bundleId));

        if (bCourses.length === 0) {
            return NextResponse.json({ error: 'Bundle has no courses' }, { status: 400 });
        }

        // Enroll in each course (skip if already enrolled)
        // Uses safeInsertEnrollment to handle concurrent duplicate attempts
        const enrolled: string[] = [];
        const skipped: string[] = [];

        for (const course of bCourses) {
            const { created } = await safeInsertEnrollment(session.user.id, course.courseId);
            if (created) {
                enrolled.push(course.courseTitle);
            } else {
                skipped.push(course.courseTitle);
            }
        }

        // Send enrollment email for all new courses (non-blocking)
        if (session.user.email && session.user.name && enrolled.length > 0) {
            sendEnrollmentEmail({
                email: session.user.email,
                name: session.user.name,
                courseName: `${bundle.title} (${enrolled.length} คอร์ส)`,
                courseSlug: bCourses[0].courseSlug,
            }).catch((err) => console.error('Failed to send bundle enrollment email:', err));
        }

        return NextResponse.json({
            message: `ลงทะเบียน Bundle สำเร็จ`,
            enrolled,
            skipped,
            totalEnrolled: enrolled.length,
            totalSkipped: skipped.length,
        }, { status: 201 });
    } catch (error) {
        console.error('Error enrolling in bundle:', error);
        return NextResponse.json({ error: 'Failed to enroll in bundle' }, { status: 500 });
    }
}

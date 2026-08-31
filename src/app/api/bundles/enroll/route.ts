import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { bundles, bundleCourses, courses, lessons, payments } from '@/lib/db/schema';
import { eq, and, count, inArray } from 'drizzle-orm';
import { sendEnrollmentEmail } from '@/lib/email';
import { checkRateLimit, rateLimits, rateLimitResponse } from '@/lib/rate-limit';
import { safeInsertEnrollment } from '@/lib/db/safe-insert';
import { requirePublishedBundleCourses, requireReadyBundleCourses } from '@/lib/bundle-commerce';
import { fulfillFreeEnrollment } from '@/lib/free-enrollment-fulfillment';

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
        if (!bundle) {
            return NextResponse.json({ error: 'Bundle not found' }, { status: 404 });
        }

        const bundlePrice = parseFloat(bundle.price);

        // If paid bundle, verify payment
        let hasAcceptedPayment = false;
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
            hasAcceptedPayment = true;
        } else if (bundlePrice > 0) {
            return NextResponse.json({ error: 'Payment required for this bundle' }, { status: 402 });
        }

        // Get courses in bundle
        const bCourses = await db
            .select({
                courseId: bundleCourses.courseId,
                courseTitle: courses.title,
                courseSlug: courses.slug,
                courseStatus: courses.status,
            })
            .from(bundleCourses)
            .innerJoin(courses, eq(bundleCourses.courseId, courses.id))
            .where(eq(bundleCourses.bundleId, bundleId));

        if (bCourses.length === 0) {
            return NextResponse.json({ error: 'Bundle has no courses' }, { status: 400 });
        }

        if (!hasAcceptedPayment) {
            if (bundle.status !== 'published') {
                return NextResponse.json({ error: 'Bundle not found' }, { status: 404 });
            }
            try {
                requirePublishedBundleCourses(bCourses.map((course) => ({
                    id: course.courseId,
                    status: course.courseStatus,
                })));
            } catch {
                return NextResponse.json({ error: 'Bundle not available' }, { status: 409 });
            }

            const lessonCountRows = await db.select({
                courseId: lessons.courseId,
                lessonCount: count(lessons.id),
            }).from(lessons)
                .where(inArray(lessons.courseId, bCourses.map((course) => course.courseId)))
                .groupBy(lessons.courseId);
            const lessonCounts = new Map(lessonCountRows.map((row) => [row.courseId, row.lessonCount]));
            try {
                requireReadyBundleCourses(bCourses.map((course) => ({
                    id: course.courseId,
                    status: course.courseStatus,
                    lessonCount: lessonCounts.get(course.courseId) ?? 0,
                })));
            } catch {
                return NextResponse.json({ error: 'BUNDLE_NOT_READY' }, { status: 409 });
            }
        }

        // Enroll in each course (skip if already enrolled)
        // Uses safeInsertEnrollment to handle concurrent duplicate attempts
        const enrolled: string[] = [];
        const skipped: string[] = [];

        if (hasAcceptedPayment) {
            for (const course of bCourses) {
                const { created } = await safeInsertEnrollment(session.user.id, course.courseId);
                if (created) {
                    enrolled.push(course.courseTitle);
                } else {
                    skipped.push(course.courseTitle);
                }
            }
        } else {
            const fulfillment = await fulfillFreeEnrollment({
                userId: session.user.id,
                courseIds: bCourses.map((course) => course.courseId),
            });
            const createdCourseIds = new Set(fulfillment.created.map((entry) => entry.courseId));
            for (const course of bCourses) {
                if (createdCourseIds.has(course.courseId)) {
                    enrolled.push(course.courseTitle);
                } else {
                    skipped.push(course.courseTitle);
                }
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


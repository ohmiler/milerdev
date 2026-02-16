import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { enrollments, courses, users, notifications, lessonProgress, lessons } from '@/lib/db/schema';
import { eq, and, isNull, sql } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';

// GET /api/admin/nudge - Get stalled learners report
export async function GET(request: Request) {
    try {
        const session = await auth();
        if (!session?.user || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const stalledDays = parseInt(searchParams.get('days') || '7');
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - stalledDays);

        // Find enrolled users who haven't completed the course
        // and whose last activity (lastWatchedAt) is older than cutoff
        const stalledUsers = await db
            .select({
                enrollmentId: enrollments.id,
                userId: enrollments.userId,
                courseId: enrollments.courseId,
                progressPercent: enrollments.progressPercent,
                enrolledAt: enrollments.enrolledAt,
                userName: users.name,
                userEmail: users.email,
                courseTitle: courses.title,
                courseSlug: courses.slug,
            })
            .from(enrollments)
            .innerJoin(users, eq(enrollments.userId, users.id))
            .innerJoin(courses, eq(enrollments.courseId, courses.id))
            .where(
                and(
                    isNull(enrollments.completedAt),
                    eq(courses.status, 'published'),
                )
            )
            .orderBy(enrollments.enrolledAt);

        // For each enrollment, get last activity date
        const results = [];
        for (const enrollment of stalledUsers) {
            const [lastActivity] = await db
                .select({ lastWatchedAt: sql<Date>`MAX(${lessonProgress.lastWatchedAt})` })
                .from(lessonProgress)
                .innerJoin(lessons, eq(lessonProgress.lessonId, lessons.id))
                .where(
                    and(
                        eq(lessonProgress.userId, enrollment.userId!),
                        eq(lessons.courseId, enrollment.courseId!)
                    )
                )
                .limit(1);

            const lastDate = lastActivity?.lastWatchedAt || enrollment.enrolledAt;
            if (!lastDate || new Date(lastDate) < cutoffDate) {
                results.push({
                    ...enrollment,
                    lastActivityAt: lastDate,
                    daysSinceActivity: lastDate
                        ? Math.floor((Date.now() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24))
                        : null,
                });
            }
        }

        // Summary
        const summary = {
            total: results.length,
            noActivity: results.filter(r => !r.lastActivityAt || r.daysSinceActivity === null).length,
            stalled7days: results.filter(r => r.daysSinceActivity && r.daysSinceActivity >= 7 && r.daysSinceActivity < 14).length,
            stalled14days: results.filter(r => r.daysSinceActivity && r.daysSinceActivity >= 14 && r.daysSinceActivity < 30).length,
            stalled30plus: results.filter(r => r.daysSinceActivity && r.daysSinceActivity >= 30).length,
        };

        return NextResponse.json({ stalledUsers: results, summary });
    } catch (error) {
        console.error('Error fetching stalled learners:', error);
        return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
    }
}

// POST /api/admin/nudge - Send nudge notifications to stalled learners
export async function POST(request: Request) {
    try {
        const session = await auth();
        if (!session?.user || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { userIds, courseIds, customMessage } = body;

        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
            return NextResponse.json({ error: 'กรุณาเลือกผู้ใช้' }, { status: 400 });
        }

        // Get course titles for notification messages
        const courseMap = new Map<string, string>();
        if (courseIds && courseIds.length > 0) {
            const coursesData = await db
                .select({ id: courses.id, title: courses.title, slug: courses.slug })
                .from(courses)
                .where(sql`${courses.id} IN ${courseIds}`);
            for (const c of coursesData) {
                courseMap.set(c.id, c.title);
            }
        }

        const notificationValues: {
            id: string;
            userId: string;
            title: string;
            message: string;
            type: 'info' | 'warning' | 'success' | 'error';
            link: string;
        }[] = [];

        for (let i = 0; i < userIds.length; i++) {
            const userId = userIds[i];
            const courseId = courseIds?.[i];
            const courseTitle = courseId ? courseMap.get(courseId) : null;

            const title = '📚 กลับมาเรียนต่อกันเถอะ!';
            const message = customMessage
                || (courseTitle
                    ? `คุณยังเรียนคอร์ส "${courseTitle}" ไม่จบ กลับมาเรียนต่อเพื่อรับใบรับรองกันเถอะ!`
                    : 'คุณมีคอร์สที่ยังเรียนไม่จบ กลับมาเรียนต่อกันเถอะ!');
            const link = '/dashboard';

            notificationValues.push({
                id: createId(),
                userId,
                title,
                message,
                type: 'info',
                link,
            });
        }

        if (notificationValues.length > 0) {
            // Insert in batches of 100
            for (let i = 0; i < notificationValues.length; i += 100) {
                const batch = notificationValues.slice(i, i + 100);
                await db.insert(notifications).values(batch);
            }
        }

        return NextResponse.json({
            success: true,
            message: `ส่ง nudge ไปยัง ${notificationValues.length} ผู้ใช้สำเร็จ`,
            sentCount: notificationValues.length,
        });
    } catch (error) {
        console.error('Error sending nudge:', error);
        return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
    }
}

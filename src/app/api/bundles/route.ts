import { NextResponse } from 'next/server';
import { logError } from '@/lib/error-handler';
import { db } from '@/lib/db';
import { bundles, bundleCourses, courses } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';

// GET /api/bundles - List published bundles
export async function GET() {
    try {
        const allBundles = await db
            .select()
            .from(bundles)
            .where(eq(bundles.status, 'published'))
            .orderBy(asc(bundles.createdAt));

        const bundlesWithCourses = await Promise.all(
            allBundles.map(async (bundle) => {
                const bCourses = await db
                    .select({
                        courseId: bundleCourses.courseId,
                        orderIndex: bundleCourses.orderIndex,
                        courseTitle: courses.title,
                        courseSlug: courses.slug,
                        coursePrice: courses.price,
                        courseThumbnail: courses.thumbnailUrl,
                        courseDescription: courses.description,
                    })
                    .from(bundleCourses)
                    .innerJoin(courses, eq(bundleCourses.courseId, courses.id))
                    .where(eq(bundleCourses.bundleId, bundle.id))
                    .orderBy(asc(bundleCourses.orderIndex));

                const totalOriginalPrice = bCourses.reduce(
                    (sum, c) => sum + parseFloat(c.coursePrice || '0'), 0
                );

                return {
                    ...bundle,
                    courses: bCourses,
                    courseCount: bCourses.length,
                    totalOriginalPrice,
                    discount: totalOriginalPrice > 0
                        ? Math.round((1 - parseFloat(bundle.price) / totalOriginalPrice) * 100)
                        : 0,
                };
            })
        );

        return NextResponse.json({ bundles: bundlesWithCourses });
    } catch (error) {
        console.error('Error fetching bundles:', error);
        return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
    }
}

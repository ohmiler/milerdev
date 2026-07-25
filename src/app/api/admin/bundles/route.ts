import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { bundles, bundleCourses, courses } from '@/lib/db/schema';
import { createId } from '@paralleldrive/cuid2';
import { desc, eq, asc } from 'drizzle-orm';
import { getAuditContext } from '@/lib/auditLog';
import { BundleMutationError, createBundleWithIntegrity } from '@/lib/bundle-mutation';
import { adminBundleMutationSchema } from '@/lib/validations/bundle';

// GET /api/admin/bundles - List all bundles with their courses
export async function GET() {
    try {
        const session = await auth();
        if (!session?.user || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const allBundles = await db
            .select()
            .from(bundles)
            .orderBy(desc(bundles.createdAt));

        // Fetch courses for each bundle
        const bundlesWithCourses = await Promise.all(
            allBundles.map(async (bundle) => {
                const bCourses = await db
                    .select({
                        id: bundleCourses.id,
                        courseId: bundleCourses.courseId,
                        orderIndex: bundleCourses.orderIndex,
                        courseTitle: courses.title,
                        courseSlug: courses.slug,
                        coursePrice: courses.price,
                        courseThumbnail: courses.thumbnailUrl,
                        courseStatus: courses.status,
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

// POST /api/admin/bundles - Create new bundle
export async function POST(request: Request) {
    try {
        const session = await auth();
        if (!session?.user || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const parsed = adminBundleMutationSchema.safeParse(await request.json());
        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid bundle data' }, { status: 400 });
        }
        const { title, description, price, status, thumbnailUrl, slug: customSlug, courseIds } = parsed.data;

        const slug = (customSlug || title)
            .toLowerCase()
            .replace(/[^a-z0-9ก-๙\s-]+/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '')
            .substring(0, 100);

        const bundleId = createId();

        await createBundleWithIntegrity({
            actorId: session.user.id,
            bundleId,
            input: {
                title,
                slug: slug || bundleId,
                description: description || null,
                price,
                status,
                thumbnailUrl: thumbnailUrl || null,
                courseIds,
            },
            auditContext: await getAuditContext(),
        });

        return NextResponse.json(
            { message: 'สร้าง Bundle สำเร็จ', bundleId },
            { status: 201 }
        );
    } catch (error) {
        if (error instanceof BundleMutationError) {
            return NextResponse.json({
                error: error.code,
                blockingCourseIds: error.blockingCourseIds,
            }, { status: error.status });
        }
        console.error('Error creating bundle:', error);
        return NextResponse.json(
            { error: 'เกิดข้อผิดพลาด กรุณาลองใหม่' },
            { status: 500 }
        );
    }
}


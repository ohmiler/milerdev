import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { bundles, bundleCourses, courses } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import { logAudit } from '@/lib/auditLog';
import { getAuditContext } from '@/lib/auditLog';
import { BundleMutationError, updateBundleWithIntegrity } from '@/lib/bundle-mutation';
import { adminBundleMutationSchema } from '@/lib/validations/bundle';

interface Props {
    params: Promise<{ id: string }>;
}

// GET /api/admin/bundles/[id] - Get single bundle
export async function GET(_request: Request, { params }: Props) {
    try {
        const session = await auth();
        if (!session?.user || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const [bundle] = await db.select().from(bundles).where(eq(bundles.id, id)).limit(1);

        if (!bundle) {
            return NextResponse.json({ error: 'ไม่พบ Bundle' }, { status: 404 });
        }

        const bCourses = await db
            .select({
                id: bundleCourses.id,
                courseId: bundleCourses.courseId,
                orderIndex: bundleCourses.orderIndex,
                courseTitle: courses.title,
                courseSlug: courses.slug,
                coursePrice: courses.price,
                courseThumbnail: courses.thumbnailUrl,
            })
            .from(bundleCourses)
            .innerJoin(courses, eq(bundleCourses.courseId, courses.id))
            .where(eq(bundleCourses.bundleId, id))
            .orderBy(asc(bundleCourses.orderIndex));

        return NextResponse.json({ bundle: { ...bundle, courses: bCourses } });
    } catch (error) {
        console.error('Error fetching bundle:', error);
        return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
    }
}

// PUT /api/admin/bundles/[id] - Update bundle
export async function PUT(request: Request, { params }: Props) {
    try {
        const session = await auth();
        if (!session?.user || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const [existing] = await db.select().from(bundles).where(eq(bundles.id, id)).limit(1);

        if (!existing) {
            return NextResponse.json({ error: 'ไม่พบ Bundle' }, { status: 404 });
        }

        const parsed = adminBundleMutationSchema.safeParse(await request.json());
        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid bundle data' }, { status: 400 });
        }
        const { title, description, price, status, thumbnailUrl, slug, courseIds } = parsed.data;

        await updateBundleWithIntegrity({
            actorId: session.user.id,
            bundleId: id,
            input: {
                title,
                slug: slug || existing.slug,
                description: description || null,
                price,
                status,
                thumbnailUrl: thumbnailUrl || null,
                courseIds,
            },
            auditContext: await getAuditContext(),
        });

        return NextResponse.json({ message: 'อัปเดต Bundle สำเร็จ' });
    } catch (error) {
        if (error instanceof BundleMutationError) {
            return NextResponse.json({
                error: error.code,
                blockingCourseIds: error.blockingCourseIds,
            }, { status: error.status });
        }
        console.error('Error updating bundle:', error);
        return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
    }
}

// DELETE /api/admin/bundles/[id] - Delete bundle
export async function DELETE(_request: Request, { params }: Props) {
    try {
        const session = await auth();
        if (!session?.user || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const [existing] = await db.select({ title: bundles.title }).from(bundles).where(eq(bundles.id, id)).limit(1);
        await db.delete(bundles).where(eq(bundles.id, id));

        await logAudit({ userId: session.user.id, action: 'delete', entityType: 'bundle', entityId: id, oldValue: existing?.title || id });

        return NextResponse.json({ message: 'ลบ Bundle สำเร็จ' });
    } catch (error) {
        console.error('Error deleting bundle:', error);
        return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
    }
}


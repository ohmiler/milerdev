import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { bundles, bundleCourses, courses } from '@/lib/db/schema';
import { createId } from '@paralleldrive/cuid2';
import { eq, asc } from 'drizzle-orm';

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

        const body = await request.json();
        const { title, description, price, status, thumbnailUrl, slug, courseIds } = body;

        await db.update(bundles).set({
            title: title || existing.title,
            slug: slug || existing.slug,
            description: description !== undefined ? (description || null) : existing.description,
            price: price !== undefined ? String(parseFloat(price) || 0) : existing.price,
            status: status || existing.status,
            thumbnailUrl: thumbnailUrl !== undefined ? (thumbnailUrl || null) : existing.thumbnailUrl,
            updatedAt: new Date(),
        }).where(eq(bundles.id, id));

        // Update courses if provided
        if (courseIds && Array.isArray(courseIds)) {
            await db.delete(bundleCourses).where(eq(bundleCourses.bundleId, id));
            if (courseIds.length > 0) {
                await db.insert(bundleCourses).values(
                    courseIds.map((courseId: string, index: number) => ({
                        id: createId(),
                        bundleId: id,
                        courseId,
                        orderIndex: index,
                    }))
                );
            }
        }

        return NextResponse.json({ message: 'อัปเดต Bundle สำเร็จ' });
    } catch (error) {
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
        await db.delete(bundles).where(eq(bundles.id, id));

        return NextResponse.json({ message: 'ลบ Bundle สำเร็จ' });
    } catch (error) {
        console.error('Error deleting bundle:', error);
        return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
    }
}

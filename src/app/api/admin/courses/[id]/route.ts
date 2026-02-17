import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { courses, courseTags, tags } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { logAudit } from '@/lib/auditLog';
import { notify } from '@/lib/notify';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/admin/courses/[id] - Get single course
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const [course] = await db
      .select()
      .from(courses)
      .where(eq(courses.id, id))
      .limit(1);

    if (!course) {
      return NextResponse.json({ error: 'ไม่พบคอร์ส' }, { status: 404 });
    }

    // Fetch tags for this course
    const courseTagRows = await db
      .select({
        id: tags.id,
        name: tags.name,
        slug: tags.slug,
      })
      .from(courseTags)
      .innerJoin(tags, eq(courseTags.tagId, tags.id))
      .where(eq(courseTags.courseId, id));

    return NextResponse.json({ course, tags: courseTagRows });
  } catch (error) {
    console.error('Error fetching course:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/courses/[id] - Update course
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { title, description, price, status, thumbnailUrl, slug, tagIds, certificateColor, certificateHeaderImage, previewVideoUrl, promoPrice, promoStartsAt, promoEndsAt } = body;

    // Check if course exists
    const [existingCourse] = await db
      .select()
      .from(courses)
      .where(eq(courses.id, id))
      .limit(1);

    if (!existingCourse) {
      return NextResponse.json({ error: 'ไม่พบคอร์ส' }, { status: 404 });
    }

    // Update course
    await db
      .update(courses)
      .set({
        title: title || existingCourse.title,
        slug: slug || existingCourse.slug,
        description: description !== undefined ? description : existingCourse.description,
        price: price !== undefined ? String(parseFloat(price) || 0) : existingCourse.price,
        status: status || existingCourse.status,
        thumbnailUrl: thumbnailUrl !== undefined ? thumbnailUrl : existingCourse.thumbnailUrl,
        certificateColor: certificateColor || existingCourse.certificateColor,
        certificateHeaderImage: certificateHeaderImage !== undefined ? (certificateHeaderImage || null) : existingCourse.certificateHeaderImage,
        previewVideoUrl: previewVideoUrl !== undefined ? (previewVideoUrl || null) : existingCourse.previewVideoUrl,
        promoPrice: promoPrice !== undefined ? (promoPrice ? String(parseFloat(promoPrice)) : null) : existingCourse.promoPrice,
        promoStartsAt: promoStartsAt !== undefined ? (promoStartsAt ? new Date(promoStartsAt) : null) : existingCourse.promoStartsAt,
        promoEndsAt: promoEndsAt !== undefined ? (promoEndsAt ? new Date(promoEndsAt) : null) : existingCourse.promoEndsAt,
        updatedAt: new Date(),
      })
      .where(eq(courses.id, id));

    // Update tags if provided
    if (tagIds !== undefined && Array.isArray(tagIds)) {
      // Delete existing tags
      await db.delete(courseTags).where(eq(courseTags.courseId, id));
      // Insert new tags
      if (tagIds.length > 0) {
        await db.insert(courseTags).values(
          tagIds.map((tagId: string) => ({
            id: createId(),
            courseId: id,
            tagId,
          }))
        );
      }
    }

    await logAudit({ userId: session.user.id, action: 'update', entityType: 'course', entityId: id, newValue: title || existingCourse.title });

    // Send notification when course is newly published (non-blocking)
    if (status === 'published' && existingCourse.status !== 'published') {
      const courseName = title || existingCourse.title;
      const courseSlug = slug || existingCourse.slug;
      notify({
        allUsers: true,
        title: `🎉 คอร์สใหม่: ${courseName}`,
        message: `คอร์ส "${courseName}" เปิดให้ลงทะเบียนแล้ว!`,
        type: 'info',
        link: `/courses/${courseSlug}`,
      }).catch(err => console.error('Failed to send new course notification:', err));
    }

    return NextResponse.json({ message: 'อัพเดทคอร์สสำเร็จ' });
  } catch (error) {
    console.error('Error updating course:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด กรุณาลองใหม่' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/courses/[id] - Delete course
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Check if course exists
    const [existingCourse] = await db
      .select()
      .from(courses)
      .where(eq(courses.id, id))
      .limit(1);

    if (!existingCourse) {
      return NextResponse.json({ error: 'ไม่พบคอร์ส' }, { status: 404 });
    }

    // Delete course
    await db.delete(courses).where(eq(courses.id, id));

    await logAudit({ userId: session.user.id, action: 'delete', entityType: 'course', entityId: id, oldValue: existingCourse.title });

    return NextResponse.json({ message: 'ลบคอร์สสำเร็จ' });
  } catch (error) {
    console.error('Error deleting course:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด กรุณาลองใหม่' },
      { status: 500 }
    );
  }
}

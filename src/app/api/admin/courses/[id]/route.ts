import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { getAuditContext, logAudit } from '@/lib/auditLog';
import { requireAdmin } from '@/lib/auth-helpers';
import { normalizeCertificateColor } from '@/lib/certificate-color';
import { CourseLifecycleError, courseLifecycleService } from '@/lib/course-lifecycle';
import { db } from '@/lib/db';
import { courses, courseTags, tags } from '@/lib/db/schema';
import { logError } from '@/lib/error-handler';
import { adminCourseLifecycleSchema, updateCourseSchema } from '@/lib/validations/admin';
import { eq } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';

interface RouteParams {
  params: Promise<{ id: string }>;
}

function revalidateCourseLifecyclePaths(slug: string): void {
  revalidatePath('/');
  revalidatePath('/courses');
  revalidatePath(`/courses/${slug}`);
  revalidatePath('/sitemap.xml');
}

function lifecycleErrorResponse(error: unknown): NextResponse | null {
  if (!(error instanceof CourseLifecycleError)) return null;
  const messages: Record<CourseLifecycleError['code'], string> = {
    INVALID_TARGET: 'ข้อมูลคอร์สไม่ถูกต้อง',
    ACTOR_FORBIDDEN: 'บัญชีผู้ดูแลไม่มีสิทธิ์ดำเนินการนี้',
    COURSE_NOT_FOUND: 'ไม่พบคอร์ส',
    INVALID_TRANSITION: 'ไม่สามารถเปลี่ยนสถานะคอร์สตามลำดับนี้ได้',
    STATE_CONFLICT: 'สถานะคอร์สมีการเปลี่ยนแปลง กรุณาลองใหม่',
    PUBLISHED_BUNDLE_DEPENDENCY: 'ต้องนำคอร์สออกจาก Bundle ที่เผยแพร่อยู่ก่อน',
  };
  return NextResponse.json({
    error: messages[error.code],
    code: error.code,
    ...(error.blockingBundles.length > 0
      ? { blockingBundles: error.blockingBundles }
      : {}),
  }, { status: error.status });
}

async function readJson(request: Request): Promise<unknown | null> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

// GET /api/admin/courses/[id] - Get single course
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const authResult = await requireAdmin();
    if (authResult instanceof NextResponse) return authResult;

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
    logError(error instanceof Error ? error : new Error(String(error)), { action: 'Error fetching course:' });
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/courses/[id] - Update course
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const authResult = await requireAdmin();
    if (authResult instanceof NextResponse) return authResult;
    const { session } = authResult;

    const { id } = await params;
    const parsed = updateCourseSchema.safeParse(await readJson(request));
    if (!parsed.success) {
      return NextResponse.json({
        error: parsed.error.issues[0]?.message || 'ข้อมูลไม่ถูกต้อง',
        code: 'INVALID_REQUEST',
      }, { status: 400 });
    }
    const { title, description, price, thumbnailUrl, slug, tagIds, certificateColor, certificateHeaderImage, previewVideoUrl, promoPrice, promoStartsAt, promoEndsAt } = parsed.data;

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
        price: price !== undefined ? String(parseFloat(String(price)) || 0) : existingCourse.price,
        thumbnailUrl: thumbnailUrl !== undefined ? thumbnailUrl : existingCourse.thumbnailUrl,
        certificateColor: certificateColor !== undefined
          ? normalizeCertificateColor(certificateColor)
          : existingCourse.certificateColor,
        certificateHeaderImage: certificateHeaderImage !== undefined ? (certificateHeaderImage || null) : existingCourse.certificateHeaderImage,
        previewVideoUrl: previewVideoUrl !== undefined ? (previewVideoUrl || null) : existingCourse.previewVideoUrl,
        promoPrice: promoPrice !== undefined ? (promoPrice ? String(parseFloat(String(promoPrice))) : null) : existingCourse.promoPrice,
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

    return NextResponse.json({ message: 'อัพเดทคอร์สสำเร็จ' });
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), { action: 'Error updating course:' });
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด กรุณาลองใหม่' },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/courses/[id] - Explicit lifecycle transition
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const authResult = await requireAdmin();
    if (authResult instanceof NextResponse) return authResult;
    const { session } = authResult;
    const { id } = await params;
    const parsed = adminCourseLifecycleSchema.safeParse(await readJson(request));
    if (!parsed.success) {
      return NextResponse.json({
        error: parsed.error.issues[0]?.message || 'ข้อมูลไม่ถูกต้อง',
        code: 'INVALID_REQUEST',
      }, { status: 400 });
    }

    const mutation = await courseLifecycleService.transition({
      actorId: session.user.id,
      courseId: id,
      action: parsed.data.action,
      expectedStatus: parsed.data.expectedStatus,
      auditContext: await getAuditContext(),
    });
    revalidateCourseLifecyclePaths(mutation.course.slug);
    return NextResponse.json({ message: 'เปลี่ยนสถานะคอร์สสำเร็จ', ...mutation });
  } catch (error) {
    const lifecycleResponse = lifecycleErrorResponse(error);
    if (lifecycleResponse) return lifecycleResponse;
    logError(error instanceof Error ? error : new Error(String(error)), { action: 'Error changing course lifecycle:' });
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด กรุณาลองใหม่' }, { status: 500 });
  }
}

// DELETE /api/admin/courses/[id] - Compatibility path that archives a course
export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const authResult = await requireAdmin();
    if (authResult instanceof NextResponse) return authResult;
    const { session } = authResult;
    const { id } = await params;
    const mutation = await courseLifecycleService.transition({
      actorId: session.user.id,
      courseId: id,
      action: 'archive',
      auditContext: await getAuditContext(),
    });
    revalidateCourseLifecyclePaths(mutation.course.slug);
    return NextResponse.json({ message: 'เก็บคอร์สเข้าคลังสำเร็จ', ...mutation });
  } catch (error) {
    const lifecycleResponse = lifecycleErrorResponse(error);
    if (lifecycleResponse) return lifecycleResponse;
    logError(error instanceof Error ? error : new Error(String(error)), { action: 'Error archiving course:' });
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด กรุณาลองใหม่' }, { status: 500 });
  }
}


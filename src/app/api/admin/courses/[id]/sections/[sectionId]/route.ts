import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { logAudit } from '@/lib/auditLog';
import { requireAdmin } from '@/lib/auth/helpers';
import { deleteCourseSection } from '@/lib/courses/course-structure-store';
import { revalidateCoursePagesById } from '@/lib/courses/revalidate';
import { db } from '@/lib/db';
import { courseSections } from '@/lib/db/schema';
import { logError } from '@/lib/error-handler';
import { courseSectionSchema, validateBody } from '@/lib/validations/admin';

interface RouteParams {
  params: Promise<{ id: string; sectionId: string }>;
}

async function readSection(courseId: string, sectionId: string) {
  const [section] = await db
    .select({ id: courseSections.id, title: courseSections.title })
    .from(courseSections)
    .where(and(eq(courseSections.id, sectionId), eq(courseSections.courseId, courseId)))
    .limit(1);
  return section ?? null;
}

// PATCH /api/admin/courses/[id]/sections/[sectionId] - Rename a section
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const guard = await requireAdmin();
    if (guard instanceof NextResponse) return guard;

    const { id: courseId, sectionId } = await params;
    const validation = validateBody(courseSectionSchema, await request.json().catch(() => null));
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const section = await readSection(courseId, sectionId);
    if (!section) return NextResponse.json({ error: 'ไม่พบหมวดนี้ในคอร์ส' }, { status: 404 });

    await db
      .update(courseSections)
      .set({ title: validation.data.title })
      .where(and(eq(courseSections.id, sectionId), eq(courseSections.courseId, courseId)));
    await logAudit({
      userId: guard.session.user.id,
      action: 'update',
      entityType: 'course_section',
      entityId: sectionId,
      oldValue: section.title,
      newValue: validation.data.title,
    });
    await revalidateCoursePagesById(courseId);

    return NextResponse.json({ message: 'แก้ชื่อหมวดสำเร็จ' });
  } catch (error) {
    logError(error, { action: 'admin.courses.id.sections.update_failed' });
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด กรุณาลองใหม่' }, { status: 500 });
  }
}

// DELETE /api/admin/courses/[id]/sections/[sectionId] - Delete a section, keeping its lessons
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const guard = await requireAdmin();
    if (guard instanceof NextResponse) return guard;

    const { id: courseId, sectionId } = await params;
    const section = await readSection(courseId, sectionId);
    if (!section) return NextResponse.json({ error: 'ไม่พบหมวดนี้ในคอร์ส' }, { status: 404 });

    const result = await deleteCourseSection(courseId, sectionId);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

    await logAudit({
      userId: guard.session.user.id,
      action: 'delete',
      entityType: 'course_section',
      entityId: sectionId,
      oldValue: section.title,
    });
    await revalidateCoursePagesById(courseId);

    return NextResponse.json({ message: 'ลบหมวดสำเร็จ' });
  } catch (error) {
    logError(error, { action: 'admin.courses.id.sections.delete_failed' });
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด กรุณาลองใหม่' }, { status: 500 });
  }
}

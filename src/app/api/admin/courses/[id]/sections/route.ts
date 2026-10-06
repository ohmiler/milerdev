import { NextResponse } from 'next/server';
import { logAudit } from '@/lib/auditLog';
import { requireAdmin } from '@/lib/auth/helpers';
import { createCourseSection } from '@/lib/courses/course-structure-store';
import { logError } from '@/lib/error-handler';
import { courseSectionSchema, validateBody } from '@/lib/validations/admin';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/admin/courses/[id]/sections - Append an empty section
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const guard = await requireAdmin();
    if (guard instanceof NextResponse) return guard;

    const { id: courseId } = await params;
    const validation = validateBody(courseSectionSchema, await request.json().catch(() => null));
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // An empty section is not shown to learners, so public pages need no revalidation yet.
    const sectionId = await createCourseSection(courseId, validation.data.title);
    await logAudit({
      userId: guard.session.user.id,
      action: 'create',
      entityType: 'course_section',
      entityId: sectionId,
      newValue: validation.data.title,
    });

    return NextResponse.json({ message: 'เพิ่มหมวดสำเร็จ', sectionId }, { status: 201 });
  } catch (error) {
    logError(error, { action: 'admin.courses.id.sections.create_failed' });
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด กรุณาลองใหม่' }, { status: 500 });
  }
}

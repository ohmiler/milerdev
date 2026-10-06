import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/helpers';
import { saveCourseStructure } from '@/lib/courses/course-structure-store';
import { revalidateCoursePagesById } from '@/lib/courses/revalidate';
import { logError } from '@/lib/error-handler';
import { courseStructureSchema, validateBody } from '@/lib/validations/admin';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/admin/courses/[id]/lessons/reorder
// Saves the order of sections and of lessons within them. The body must name every
// section and lesson of the course once, so a stale editor gets 409 instead of a partial write.
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const guard = await requireAdmin();
    if (guard instanceof NextResponse) return guard;

    const { id: courseId } = await params;
    const validation = validateBody(courseStructureSchema, await request.json().catch(() => null));
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const result = await saveCourseStructure(courseId, validation.data);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    await revalidateCoursePagesById(courseId);

    return NextResponse.json({ message: 'จัดลำดับบทเรียนสำเร็จ' });
  } catch (error) {
    logError(error, { action: 'admin.courses.id.lessons.reorder.reorder_failed' });
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด กรุณาลองใหม่' },
      { status: 500 }
    );
  }
}

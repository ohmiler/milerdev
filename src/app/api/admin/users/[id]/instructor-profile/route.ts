import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { logAudit } from '@/lib/auditLog';
import { requireAdmin } from '@/lib/auth/helpers';
import { revalidateInstructorCoursePages } from '@/lib/courses/revalidate';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { logError } from '@/lib/error-handler';
import { adminInstructorProfileSchema } from '@/lib/validations/admin';

interface RouteParams {
  params: Promise<{ id: string }>;
}

async function readJson(request: Request): Promise<unknown | null> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

// PUT /api/admin/users/[id]/instructor-profile - The public instructor card on course pages.
// It writes only the profile fields, never role, name or session state, which stay with the
// user lifecycle authority in ../route.ts.
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const authResult = await requireAdmin();
    if (authResult instanceof NextResponse) return authResult;
    const { session } = authResult;
    const { id } = await params;

    const parsed = adminInstructorProfileSchema.safeParse(await readJson(request));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'ข้อมูลไม่ถูกต้อง', code: 'INVALID_REQUEST' },
        { status: 400 },
      );
    }

    const [user] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    if (!user) {
      return NextResponse.json({ error: 'ไม่พบผู้ใช้', code: 'USER_NOT_FOUND' }, { status: 404 });
    }
    if (user.role !== 'instructor' && user.role !== 'admin') {
      return NextResponse.json(
        { error: 'ใส่ประวัติผู้สอนได้เฉพาะบัญชีผู้สอนหรือผู้ดูแล', code: 'NOT_INSTRUCTOR' },
        { status: 400 },
      );
    }

    const { headline, bio, profileLinks } = parsed.data;
    await db
      .update(users)
      .set({
        headline: headline || null,
        bio: bio || null,
        profileLinks: profileLinks.length > 0 ? profileLinks : null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id));
    await logAudit({ userId: session.user.id, action: 'update', entityType: 'instructor_profile', entityId: id });
    // Course pages are cached for an hour; show the new card on the courses this person teaches now.
    await revalidateInstructorCoursePages(id);

    return NextResponse.json({ message: 'บันทึกประวัติผู้สอนแล้ว' });
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), { action: 'admin.users.instructor_profile.update_failed' });
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด กรุณาลองใหม่' }, { status: 500 });
  }
}

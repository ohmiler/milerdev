import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-helpers';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { lessons } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/admin/courses/[id]/lessons/reorder
// Reorder lessons using Gap-based approach
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await params; // validate params
    const { lessonIds } = await request.json();

    if (!lessonIds || !Array.isArray(lessonIds)) {
      return NextResponse.json(
        { error: 'กรุณาระบุ lessonIds' },
        { status: 400 }
      );
    }

    // Update orderIndex for each lesson using Gap-based (multiply by 100)
    const updates = lessonIds.map((lessonId: string, index: number) =>
      db
        .update(lessons)
        .set({ orderIndex: (index + 1) * 100 })
        .where(eq(lessons.id, lessonId))
    );

    await Promise.all(updates);

    return NextResponse.json({ 
      message: 'จัดลำดับบทเรียนสำเร็จ',
      newOrder: lessonIds.map((id: string, i: number) => ({ id, orderIndex: (i + 1) * 100 }))
    });
  } catch (error) {
    console.error('Error reordering lessons:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด กรุณาลองใหม่' },
      { status: 500 }
    );
  }
}

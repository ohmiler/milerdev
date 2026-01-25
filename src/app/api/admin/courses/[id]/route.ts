import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { courses } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

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

    return NextResponse.json({ course });
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
    const { title, description, price, status, thumbnailUrl, slug } = body;

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
        updatedAt: new Date(),
      })
      .where(eq(courses.id, id));

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

    return NextResponse.json({ message: 'ลบคอร์สสำเร็จ' });
  } catch (error) {
    console.error('Error deleting course:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด กรุณาลองใหม่' },
      { status: 500 }
    );
  }
}

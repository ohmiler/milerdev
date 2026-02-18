import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-helpers';
import { db } from '@/lib/db';
import { media } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { deleteFromBunny } from '@/lib/bunny-storage';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/admin/media/[id] - Get single media file
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const authResult = await requireAdmin();
    if (authResult instanceof NextResponse) return authResult;
    const { session } = authResult;

    const { id } = await params;

    const [mediaFile] = await db
      .select()
      .from(media)
      .where(eq(media.id, id))
      .limit(1);

    if (!mediaFile) {
      return NextResponse.json({ error: 'ไม่พบไฟล์' }, { status: 404 });
    }

    return NextResponse.json({ media: mediaFile });
  } catch (error) {
    console.error('Error fetching media:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/media/[id] - Delete media file
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const authResult = await requireAdmin();
    if (authResult instanceof NextResponse) return authResult;
    const { session } = authResult;

    const { id } = await params;

    // Get media file info
    const [mediaFile] = await db
      .select()
      .from(media)
      .where(eq(media.id, id))
      .limit(1);

    if (!mediaFile) {
      return NextResponse.json({ error: 'ไม่พบไฟล์' }, { status: 404 });
    }

    // Delete file from Bunny Storage
    await deleteFromBunny(mediaFile.url);

    // Delete from database
    await db.delete(media).where(eq(media.id, id));

    return NextResponse.json({ message: 'ลบไฟล์สำเร็จ' });
  } catch (error) {
    console.error('Error deleting media:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการลบไฟล์' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { media } from '@/lib/db/schema';
import { and, desc, eq, sql, like } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { uploadToBunny } from '@/lib/bunny-storage';

// GET /api/admin/media - Get all media files
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20') || 20));
    const type = searchParams.get('type') || 'all';
    const search = searchParams.get('search') || '';
    const offset = (page - 1) * limit;

    // Build query conditions
    const conditions = [];
    if (type !== 'all') {
      conditions.push(eq(media.type, type as 'image' | 'video' | 'document'));
    }
    if (search) {
      conditions.push(like(media.originalName, `%${search}%`));
    }

    // Get media files
    const mediaList = await db
      .select()
      .from(media)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(media.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count
    const [{ count: totalCount }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(media);

    // Get stats
    const [stats] = await db
      .select({
        total: sql<number>`count(*)`,
        images: sql<number>`sum(case when type = 'image' then 1 else 0 end)`,
        videos: sql<number>`sum(case when type = 'video' then 1 else 0 end)`,
        documents: sql<number>`sum(case when type = 'document' then 1 else 0 end)`,
        totalSize: sql<number>`sum(size)`,
      })
      .from(media);

    return NextResponse.json({
      media: mediaList,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
      stats: {
        total: stats?.total || 0,
        images: stats?.images || 0,
        videos: stats?.videos || 0,
        documents: stats?.documents || 0,
        totalSize: stats?.totalSize || 0,
      },
    });
  } catch (error) {
    console.error('Error fetching media:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด' },
      { status: 500 }
    );
  }
}

// POST /api/admin/media - Upload new media file to Bunny CDN
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'กรุณาเลือกไฟล์' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'รองรับเฉพาะไฟล์รูปภาพ (jpg, png, gif, webp, svg)' },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'ขนาดไฟล์ต้องไม่เกิน 10MB' },
        { status: 400 }
      );
    }

    // Upload to Bunny CDN
    const { url, fileName } = await uploadToBunny(file, 'media');

    // Save to database
    const mediaId = createId();

    await db.insert(media).values({
      id: mediaId,
      filename: fileName,
      originalName: file.name,
      mimeType: file.type,
      size: file.size,
      url,
      type: 'image',
      uploadedBy: session.user.id,
    });

    return NextResponse.json({
      message: 'อัพโหลดสำเร็จ',
      media: {
        id: mediaId,
        filename: fileName,
        originalName: file.name,
        url,
        size: file.size,
        mimeType: file.type,
      },
    });
  } catch (error) {
    console.error('Error uploading media:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการอัพโหลด' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { logError } from '@/lib/error-handler';
import { db } from '@/lib/db';
import { tags } from '@/lib/db/schema';

// GET /api/tags - Get all tags (public)
export async function GET() {
  try {
    const tagList = await db
      .select({
        id: tags.id,
        name: tags.name,
        slug: tags.slug,
      })
      .from(tags)
      .orderBy(tags.name);

    return NextResponse.json({ tags: tagList });
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), { action: 'Error fetching tags:' });
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด' },
      { status: 500 }
    );
  }
}

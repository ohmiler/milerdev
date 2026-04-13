import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { docs } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';

export async function POST(
    _req: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    const { slug } = await params;

    await db
        .update(docs)
        .set({ viewCount: sql`${docs.viewCount} + 1` })
        .where(eq(docs.slug, decodeURIComponent(slug)));

    return NextResponse.json({ ok: true });
}

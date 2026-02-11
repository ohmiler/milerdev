import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { affiliateBanners } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';

// GET /api/affiliate-banners - Get active banners (public)
export async function GET() {
    try {
        const banners = await db
            .select({
                id: affiliateBanners.id,
                title: affiliateBanners.title,
                imageUrl: affiliateBanners.imageUrl,
                linkUrl: affiliateBanners.linkUrl,
            })
            .from(affiliateBanners)
            .where(eq(affiliateBanners.isActive, true))
            .orderBy(asc(affiliateBanners.orderIndex));

        return NextResponse.json({ banners });
    } catch (error) {
        console.error('Error fetching active banners:', error);
        return NextResponse.json({ banners: [] });
    }
}

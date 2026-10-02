import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { affiliateBanners } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import { logError } from '@/lib/error-handler';

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
        logError(error, { action: 'affiliate_banners.fetch_failed' });
        return NextResponse.json({ banners: [] });
    }
}


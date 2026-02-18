import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-helpers';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { affiliateBanners } from '@/lib/db/schema';
import { desc, asc } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';

// GET /api/admin/affiliate-banners - Get all banners
export async function GET() {
    try {
        const session = await auth();
        if (!session?.user || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const banners = await db
            .select()
            .from(affiliateBanners)
            .orderBy(asc(affiliateBanners.orderIndex), desc(affiliateBanners.createdAt));

        return NextResponse.json({ banners });
    } catch (error) {
        console.error('Error fetching affiliate banners:', error);
        return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
    }
}

// POST /api/admin/affiliate-banners - Create banner
export async function POST(request: Request) {
    try {
        const session = await auth();
        if (!session?.user || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { title, imageUrl, linkUrl, orderIndex, isActive } = body;

        if (!title || !imageUrl || !linkUrl) {
            return NextResponse.json({ error: 'กรุณากรอกข้อมูลให้ครบ' }, { status: 400 });
        }

        const id = createId();
        await db.insert(affiliateBanners).values({
            id,
            title,
            imageUrl,
            linkUrl,
            orderIndex: orderIndex || 0,
            isActive: isActive !== false,
        });

        return NextResponse.json({ id, message: 'สร้าง Banner สำเร็จ' });
    } catch (error) {
        console.error('Error creating affiliate banner:', error);
        return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
    }
}

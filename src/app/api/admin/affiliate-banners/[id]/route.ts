import { NextResponse } from 'next/server';
import { logError } from '@/lib/error-handler';
import { requireAdmin } from '@/lib/auth-helpers';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { affiliateBanners } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

interface Props {
    params: Promise<{ id: string }>;
}

// PUT /api/admin/affiliate-banners/[id] - Update banner
export async function PUT(request: Request, { params }: Props) {
    try {
        const session = await auth();
        if (!session?.user || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();
        const { title, imageUrl, linkUrl, orderIndex, isActive } = body;

        await db
            .update(affiliateBanners)
            .set({
                ...(title !== undefined && { title }),
                ...(imageUrl !== undefined && { imageUrl }),
                ...(linkUrl !== undefined && { linkUrl }),
                ...(orderIndex !== undefined && { orderIndex }),
                ...(isActive !== undefined && { isActive }),
                updatedAt: new Date(),
            })
            .where(eq(affiliateBanners.id, id));

        return NextResponse.json({ message: 'อัพเดท Banner สำเร็จ' });
    } catch (error) {
        console.error('Error updating affiliate banner:', error);
        return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
    }
}

// DELETE /api/admin/affiliate-banners/[id] - Delete banner
export async function DELETE(_request: Request, { params }: Props) {
    try {
        const session = await auth();
        if (!session?.user || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;

        await db
            .delete(affiliateBanners)
            .where(eq(affiliateBanners.id, id));

        return NextResponse.json({ message: 'ลบ Banner สำเร็จ' });
    } catch (error) {
        console.error('Error deleting affiliate banner:', error);
        return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
    }
}

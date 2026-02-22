import { NextResponse } from 'next/server';
import { logError } from '@/lib/error-handler';
import { requireAdmin } from '@/lib/auth-helpers';
import { db } from '@/lib/db';
import { docGroups } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { logAudit } from '@/lib/auditLog';

// GET /api/admin/docs/groups - List all doc groups
export async function GET() {
    try {
        const authResult = await requireAdmin();
        if (authResult instanceof NextResponse) return authResult;

        const groups = await db
            .select()
            .from(docGroups)
            .orderBy(asc(docGroups.orderIndex));

        return NextResponse.json(groups);
    } catch (error) {
        logError(error instanceof Error ? error : new Error(String(error)), { action: 'Error fetching doc groups' });
        return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
    }
}

// POST /api/admin/docs/groups - Create doc group
export async function POST(request: Request) {
    try {
        const authResult = await requireAdmin();
        if (authResult instanceof NextResponse) return authResult;
        const { session } = authResult;

        const body = await request.json();
        const { title, slug: customSlug, description, orderIndex } = body;

        if (!title) {
            return NextResponse.json({ error: 'กรุณาระบุชื่อหมวดหมู่' }, { status: 400 });
        }

        const slug = (customSlug || title)
            .toLowerCase()
            .replace(/[^a-z0-9\s-]+/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '')
            .substring(0, 200);

        const [existing] = await db
            .select({ id: docGroups.id })
            .from(docGroups)
            .where(eq(docGroups.slug, slug))
            .limit(1);

        if (existing) {
            return NextResponse.json({ error: `Slug "${slug}" มีอยู่แล้ว` }, { status: 409 });
        }

        const id = createId();
        await db.insert(docGroups).values({
            id,
            title,
            slug,
            description: description || null,
            orderIndex: typeof orderIndex === 'number' ? orderIndex : 0,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        await logAudit({ userId: session.user.id, action: 'create', entityType: 'doc_group', entityId: id, newValue: title });

        return NextResponse.json({ id, message: 'สร้างหมวดหมู่สำเร็จ' }, { status: 201 });
    } catch (error) {
        logError(error instanceof Error ? error : new Error(String(error)), { action: 'Error creating doc group' });
        return NextResponse.json({ error: 'เกิดข้อผิดพลาด กรุณาลองใหม่' }, { status: 500 });
    }
}

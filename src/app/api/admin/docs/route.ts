import { NextResponse } from 'next/server';
import { logError } from '@/lib/error-handler';
import { requireAdmin } from '@/lib/auth-helpers';
import { db } from '@/lib/db';
import { docs, docGroups } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { logAudit } from '@/lib/auditLog';
import { sanitizeRichContent } from '@/lib/sanitize';

// GET /api/admin/docs - List all docs with their group
export async function GET() {
    try {
        const authResult = await requireAdmin();
        if (authResult instanceof NextResponse) return authResult;

        const allDocs = await db
            .select({
                id: docs.id,
                groupId: docs.groupId,
                title: docs.title,
                slug: docs.slug,
                content: docs.content,
                orderIndex: docs.orderIndex,
                status: docs.status,
                viewCount: docs.viewCount,
                createdAt: docs.createdAt,
                updatedAt: docs.updatedAt,
                group: {
                    id: docGroups.id,
                    title: docGroups.title,
                    slug: docGroups.slug,
                    orderIndex: docGroups.orderIndex,
                },
            })
            .from(docs)
            .leftJoin(docGroups, eq(docs.groupId, docGroups.id))
            .orderBy(desc(docs.createdAt));

        return NextResponse.json(allDocs);
    } catch (error) {
        logError(error instanceof Error ? error : new Error(String(error)), { action: 'Error fetching docs' });
        return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
    }
}

// POST /api/admin/docs - Create doc
export async function POST(request: Request) {
    try {
        const authResult = await requireAdmin();
        if (authResult instanceof NextResponse) return authResult;
        const { session } = authResult;

        const body = await request.json();
        const { title, slug: customSlug, groupId, content, status, orderIndex } = body;

        if (!title) {
            return NextResponse.json({ error: 'กรุณาระบุชื่อบทความ' }, { status: 400 });
        }
        if (!groupId) {
            return NextResponse.json({ error: 'กรุณาเลือกหมวดหมู่' }, { status: 400 });
        }

        const [group] = await db.select({ id: docGroups.id }).from(docGroups).where(eq(docGroups.id, groupId)).limit(1);
        if (!group) {
            return NextResponse.json({ error: 'ไม่พบหมวดหมู่' }, { status: 400 });
        }

        const slug = (customSlug || title)
            .toLowerCase()
            .replace(/[^a-z0-9\s-]+/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '')
            .substring(0, 200);

        const [existing] = await db.select({ id: docs.id }).from(docs).where(eq(docs.slug, slug)).limit(1);
        if (existing) {
            return NextResponse.json({ error: `Slug "${slug}" มีอยู่แล้ว` }, { status: 409 });
        }

        const id = createId();
        await db.insert(docs).values({
            id,
            groupId,
            title,
            slug,
            content: content ? sanitizeRichContent(content) : null,
            status: status === 'published' ? 'published' : 'draft',
            orderIndex: typeof orderIndex === 'number' ? orderIndex : 0,
            viewCount: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        await logAudit({ userId: session.user.id, action: 'create', entityType: 'doc', entityId: id, newValue: title });

        return NextResponse.json({ id, message: 'สร้างบทความสำเร็จ' }, { status: 201 });
    } catch (error) {
        logError(error instanceof Error ? error : new Error(String(error)), { action: 'Error creating doc' });
        return NextResponse.json({ error: 'เกิดข้อผิดพลาด กรุณาลองใหม่' }, { status: 500 });
    }
}

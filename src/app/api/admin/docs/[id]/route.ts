import { NextResponse } from 'next/server';
import { logError } from '@/lib/error-handler';
import { requireAdmin } from '@/lib/auth-helpers';
import { db } from '@/lib/db';
import { docs, docGroups } from '@/lib/db/schema';
import { eq, and, ne } from 'drizzle-orm';
import { logAudit } from '@/lib/auditLog';
import { sanitizeRichContent } from '@/lib/sanitize';

interface RouteParams {
    params: Promise<{ id: string }>;
}

// GET /api/admin/docs/[id] - Get single doc
export async function GET(request: Request, { params }: RouteParams) {
    try {
        const authResult = await requireAdmin();
        if (authResult instanceof NextResponse) return authResult;

        const { id } = await params;

        const [doc] = await db.select().from(docs).where(eq(docs.id, id)).limit(1);
        if (!doc) {
            return NextResponse.json({ error: 'ไม่พบบทความ' }, { status: 404 });
        }

        return NextResponse.json(doc);
    } catch (error) {
        logError(error instanceof Error ? error : new Error(String(error)), { action: 'Error fetching doc' });
        return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
    }
}

// PUT /api/admin/docs/[id] - Update doc
export async function PUT(request: Request, { params }: RouteParams) {
    try {
        const authResult = await requireAdmin();
        if (authResult instanceof NextResponse) return authResult;
        const { session } = authResult;

        const { id } = await params;
        const body = await request.json();
        const { title, slug: customSlug, groupId, content, status, orderIndex } = body;

        if (!title) {
            return NextResponse.json({ error: 'กรุณาระบุชื่อบทความ' }, { status: 400 });
        }

        const [doc] = await db.select({ id: docs.id }).from(docs).where(eq(docs.id, id)).limit(1);
        if (!doc) {
            return NextResponse.json({ error: 'ไม่พบบทความ' }, { status: 404 });
        }

        if (groupId) {
            const [group] = await db.select({ id: docGroups.id }).from(docGroups).where(eq(docGroups.id, groupId)).limit(1);
            if (!group) {
                return NextResponse.json({ error: 'ไม่พบหมวดหมู่' }, { status: 400 });
            }
        }

        const slug = (customSlug || title)
            .toLowerCase()
            .replace(/[^a-z0-9\s-]+/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '')
            .substring(0, 200);

        const [slugConflict] = await db
            .select({ id: docs.id })
            .from(docs)
            .where(and(eq(docs.slug, slug), ne(docs.id, id)))
            .limit(1);

        if (slugConflict) {
            return NextResponse.json({ error: `Slug "${slug}" มีอยู่แล้ว` }, { status: 409 });
        }

        await db.update(docs).set({
            ...(groupId && { groupId }),
            title,
            slug,
            content: content ? sanitizeRichContent(content) : null,
            status: status === 'published' ? 'published' : 'draft',
            orderIndex: typeof orderIndex === 'number' ? orderIndex : 0,
            updatedAt: new Date(),
        }).where(eq(docs.id, id));

        await logAudit({ userId: session.user.id, action: 'update', entityType: 'doc', entityId: id, newValue: title });

        return NextResponse.json({ message: 'อัปเดตบทความสำเร็จ' });
    } catch (error) {
        logError(error instanceof Error ? error : new Error(String(error)), { action: 'Error updating doc' });
        return NextResponse.json({ error: 'เกิดข้อผิดพลาด กรุณาลองใหม่' }, { status: 500 });
    }
}

// DELETE /api/admin/docs/[id] - Delete doc
export async function DELETE(request: Request, { params }: RouteParams) {
    try {
        const authResult = await requireAdmin();
        if (authResult instanceof NextResponse) return authResult;
        const { session } = authResult;

        const { id } = await params;

        const [doc] = await db.select({ id: docs.id, title: docs.title }).from(docs).where(eq(docs.id, id)).limit(1);
        if (!doc) {
            return NextResponse.json({ error: 'ไม่พบบทความ' }, { status: 404 });
        }

        await db.delete(docs).where(eq(docs.id, id));

        await logAudit({ userId: session.user.id, action: 'delete', entityType: 'doc', entityId: id, newValue: doc.title });

        return NextResponse.json({ message: 'ลบบทความสำเร็จ' });
    } catch (error) {
        logError(error instanceof Error ? error : new Error(String(error)), { action: 'Error deleting doc' });
        return NextResponse.json({ error: 'เกิดข้อผิดพลาด กรุณาลองใหม่' }, { status: 500 });
    }
}

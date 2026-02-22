import { NextResponse } from 'next/server';
import { logError } from '@/lib/error-handler';
import { requireAdmin } from '@/lib/auth-helpers';
import { db } from '@/lib/db';
import { docGroups, docs } from '@/lib/db/schema';
import { eq, and, ne, count } from 'drizzle-orm';
import { logAudit } from '@/lib/auditLog';

interface RouteParams {
    params: Promise<{ id: string }>;
}

// PUT /api/admin/docs/groups/[id] - Update doc group
export async function PUT(request: Request, { params }: RouteParams) {
    try {
        const authResult = await requireAdmin();
        if (authResult instanceof NextResponse) return authResult;
        const { session } = authResult;

        const { id } = await params;
        const body = await request.json();
        const { title, slug: customSlug, description, orderIndex } = body;

        if (!title) {
            return NextResponse.json({ error: 'กรุณาระบุชื่อหมวดหมู่' }, { status: 400 });
        }

        const [group] = await db.select({ id: docGroups.id }).from(docGroups).where(eq(docGroups.id, id)).limit(1);
        if (!group) {
            return NextResponse.json({ error: 'ไม่พบหมวดหมู่' }, { status: 404 });
        }

        const slug = (customSlug || title)
            .toLowerCase()
            .replace(/[^a-z0-9\s-]+/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '')
            .substring(0, 200);

        const [slugConflict] = await db
            .select({ id: docGroups.id })
            .from(docGroups)
            .where(and(eq(docGroups.slug, slug), ne(docGroups.id, id)))
            .limit(1);

        if (slugConflict) {
            return NextResponse.json({ error: `Slug "${slug}" มีอยู่แล้ว` }, { status: 409 });
        }

        await db.update(docGroups).set({
            title,
            slug,
            description: description || null,
            orderIndex: typeof orderIndex === 'number' ? orderIndex : 0,
            updatedAt: new Date(),
        }).where(eq(docGroups.id, id));

        await logAudit({ userId: session.user.id, action: 'update', entityType: 'doc_group', entityId: id, newValue: title });

        return NextResponse.json({ message: 'อัปเดตหมวดหมู่สำเร็จ' });
    } catch (error) {
        logError(error instanceof Error ? error : new Error(String(error)), { action: 'Error updating doc group' });
        return NextResponse.json({ error: 'เกิดข้อผิดพลาด กรุณาลองใหม่' }, { status: 500 });
    }
}

// DELETE /api/admin/docs/groups/[id] - Delete doc group
export async function DELETE(request: Request, { params }: RouteParams) {
    try {
        const authResult = await requireAdmin();
        if (authResult instanceof NextResponse) return authResult;
        const { session } = authResult;

        const { id } = await params;

        const [group] = await db.select({ id: docGroups.id, title: docGroups.title }).from(docGroups).where(eq(docGroups.id, id)).limit(1);
        if (!group) {
            return NextResponse.json({ error: 'ไม่พบหมวดหมู่' }, { status: 404 });
        }

        // Check for docs in this group (cascade delete will remove them)
        const [{ docCount }] = await db.select({ docCount: count() }).from(docs).where(eq(docs.groupId, id));
        const url = new URL(request.url);
        if (docCount > 0 && url.searchParams.get('force') !== 'true') {
            return NextResponse.json({
                error: `หมวดหมู่นี้มี ${docCount} บทความ การลบจะลบบทความทั้งหมดด้วย`,
                docCount,
                requireForce: true,
            }, { status: 409 });
        }

        await db.delete(docGroups).where(eq(docGroups.id, id));

        await logAudit({ userId: session.user.id, action: 'delete', entityType: 'doc_group', entityId: id, newValue: group.title });

        return NextResponse.json({ message: 'ลบหมวดหมู่สำเร็จ' });
    } catch (error) {
        logError(error instanceof Error ? error : new Error(String(error)), { action: 'Error deleting doc group' });
        return NextResponse.json({ error: 'เกิดข้อผิดพลาด กรุณาลองใหม่' }, { status: 500 });
    }
}

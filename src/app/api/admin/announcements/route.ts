import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-helpers';
import { db } from '@/lib/db';
import { announcements, users } from '@/lib/db/schema';
import { desc, eq, sql, and } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { logAudit } from '@/lib/auditLog';
import { notify } from '@/lib/notify';

// GET /api/admin/announcements - Get all announcements
export async function GET(request: Request) {
  try {
    const authResult = await requireAdmin();
    if (authResult instanceof NextResponse) return authResult;
    const { session } = authResult;

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20') || 20));
    const status = searchParams.get('status') || 'all';
    const offset = (page - 1) * limit;

    // Build conditions
    const conditions = [];
    if (status === 'active') {
      conditions.push(eq(announcements.isActive, true));
    } else if (status === 'inactive') {
      conditions.push(eq(announcements.isActive, false));
    }

    // Get announcements with creator info
    const announcementList = await db
      .select({
        id: announcements.id,
        title: announcements.title,
        content: announcements.content,
        type: announcements.type,
        targetRole: announcements.targetRole,
        isActive: announcements.isActive,
        startsAt: announcements.startsAt,
        endsAt: announcements.endsAt,
        createdAt: announcements.createdAt,
        createdBy: announcements.createdBy,
        creatorName: users.name,
        creatorEmail: users.email,
      })
      .from(announcements)
      .leftJoin(users, eq(announcements.createdBy, users.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(announcements.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count
    const [{ count: totalCount }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(announcements)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    // Get stats
    const [stats] = await db
      .select({
        total: sql<number>`count(*)`,
        active: sql<number>`sum(case when is_active = 1 then 1 else 0 end)`,
        inactive: sql<number>`sum(case when is_active = 0 then 1 else 0 end)`,
      })
      .from(announcements);

    return NextResponse.json({
      announcements: announcementList,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
      stats: {
        total: stats?.total || 0,
        active: stats?.active || 0,
        inactive: stats?.inactive || 0,
      },
    });
  } catch (error) {
    console.error('Error fetching announcements:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด' },
      { status: 500 }
    );
  }
}

// POST /api/admin/announcements - Create new announcement
export async function POST(request: Request) {
  try {
    const authResult = await requireAdmin();
    if (authResult instanceof NextResponse) return authResult;
    const { session } = authResult;

    const body = await request.json();
    const { title, content, type, targetRole, isActive, startsAt, endsAt } = body;

    if (!title || !content) {
      return NextResponse.json(
        { error: 'กรุณาระบุหัวข้อและเนื้อหา' },
        { status: 400 }
      );
    }

    const announcementId = createId();

    await db.insert(announcements).values({
      id: announcementId,
      title,
      content,
      type: type || 'info',
      targetRole: targetRole || 'all',
      isActive: isActive !== false,
      startsAt: startsAt ? new Date(startsAt) : null,
      endsAt: endsAt ? new Date(endsAt) : null,
      createdBy: session.user.id,
    });

    await logAudit({ userId: session.user.id, action: 'create', entityType: 'announcement', entityId: announcementId, newValue: title });

    // Send notification to target users (non-blocking)
    if (isActive !== false) {
      const role = targetRole && targetRole !== 'all' ? targetRole : undefined;
      notify({
        ...(role ? { targetRole: role } : { allUsers: true }),
        title: `📢 ${title}`,
        message: content?.slice(0, 100) || undefined,
        type: (type as 'info' | 'success' | 'warning' | 'error') || 'info',
        link: '/announcements',
      }).catch(err => console.error('Failed to send announcement notifications:', err));
    }

    return NextResponse.json({
      message: 'สร้างประกาศสำเร็จ',
      announcement: { id: announcementId },
    });
  } catch (error) {
    console.error('Error creating announcement:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการสร้างประกาศ' },
      { status: 500 }
    );
  }
}

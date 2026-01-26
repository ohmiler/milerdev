import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { announcements, users, notifications } from '@/lib/db/schema';
import { desc, eq, sql, and, or, gte, lte } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';

// GET /api/admin/announcements - Get all announcements
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
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
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, content, type, targetRole, isActive, startsAt, endsAt, sendNotification } = body;

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

    // Send notification to users if requested
    if (sendNotification) {
      // Get target users
      const targetUsers = await db
        .select({ id: users.id })
        .from(users)
        .where(
          targetRole && targetRole !== 'all'
            ? eq(users.role, targetRole)
            : undefined
        );

      // Create notifications for each user
      const notificationValues = targetUsers.map(user => ({
        id: createId(),
        userId: user.id,
        title: `📢 ${title}`,
        message: content.substring(0, 200) + (content.length > 200 ? '...' : ''),
        type: type || 'info',
        link: '/announcements',
      }));

      if (notificationValues.length > 0) {
        await db.insert(notifications).values(notificationValues);
      }
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

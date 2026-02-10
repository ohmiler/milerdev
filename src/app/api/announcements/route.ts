import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { announcements, users } from '@/lib/db/schema';
import { desc, eq, and, sql } from 'drizzle-orm';
import { auth } from '@/lib/auth';

// GET /api/announcements - Get active announcements for current user
export async function GET() {
  try {
    const session = await auth();
    const userRole = session?.user?.role || 'student';
    const now = new Date();

    const activeAnnouncements = await db
      .select({
        id: announcements.id,
        title: announcements.title,
        content: announcements.content,
        type: announcements.type,
        targetRole: announcements.targetRole,
        startsAt: announcements.startsAt,
        endsAt: announcements.endsAt,
        createdAt: announcements.createdAt,
        creatorName: users.name,
      })
      .from(announcements)
      .leftJoin(users, eq(announcements.createdBy, users.id))
      .where(
        and(
          eq(announcements.isActive, true),
          // Started or no start date
          sql`(${announcements.startsAt} IS NULL OR ${announcements.startsAt} <= ${now})`,
          // Not ended or no end date
          sql`(${announcements.endsAt} IS NULL OR ${announcements.endsAt} >= ${now})`,
          // Target role matches
          sql`(${announcements.targetRole} = 'all' OR ${announcements.targetRole} = ${userRole})`,
        )
      )
      .orderBy(desc(announcements.createdAt))
      .limit(10);

    return NextResponse.json({ announcements: activeAnnouncements });
  } catch (error) {
    console.error('Error fetching announcements:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { auditLogs, users } from '@/lib/db/schema';
import { desc, eq, sql, and, gte, lte } from 'drizzle-orm';

// GET /api/admin/audit-logs - Get audit logs
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const entityType = searchParams.get('entityType');
    const action = searchParams.get('action');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const offset = (page - 1) * limit;

    // Build conditions
    const conditions = [];
    
    if (entityType && entityType !== 'all') {
      conditions.push(eq(auditLogs.entityType, entityType));
    }
    
    if (action && action !== 'all') {
      conditions.push(eq(auditLogs.action, action));
    }

    if (dateFrom) {
      conditions.push(gte(auditLogs.createdAt, new Date(dateFrom)));
    }

    if (dateTo) {
      conditions.push(lte(auditLogs.createdAt, new Date(dateTo)));
    }

    // Get logs with user info
    const logs = await db
      .select({
        id: auditLogs.id,
        userId: auditLogs.userId,
        action: auditLogs.action,
        entityType: auditLogs.entityType,
        entityId: auditLogs.entityId,
        oldValue: auditLogs.oldValue,
        newValue: auditLogs.newValue,
        ipAddress: auditLogs.ipAddress,
        createdAt: auditLogs.createdAt,
        userName: users.name,
        userEmail: users.email,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count
    const [{ count: totalCount }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(auditLogs)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    // Get distinct entity types for filter
    const entityTypes = await db
      .selectDistinct({ entityType: auditLogs.entityType })
      .from(auditLogs);

    // Get distinct actions for filter
    const actions = await db
      .selectDistinct({ action: auditLogs.action })
      .from(auditLogs);

    return NextResponse.json({
      logs,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
      filters: {
        entityTypes: entityTypes.map(e => e.entityType),
        actions: actions.map(a => a.action),
      },
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด' },
      { status: 500 }
    );
  }
}

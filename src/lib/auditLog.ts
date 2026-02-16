import { db } from '@/lib/db';
import { auditLogs } from '@/lib/db/schema';
import { createId } from '@paralleldrive/cuid2';
import { headers } from 'next/headers';
import { getClientIPFromHeaders } from '@/lib/rate-limit';

interface AuditLogParams {
  userId: string;
  action: 'create' | 'update' | 'delete';
  entityType: string;
  entityId?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
}

export async function logAudit({
  userId,
  action,
  entityType,
  entityId = null,
  oldValue = null,
  newValue = null,
}: AuditLogParams) {
  try {
    const headersList = await headers();
    const ipAddress = getClientIPFromHeaders(headersList);
    const userAgent = headersList.get('user-agent') || null;

    await db.insert(auditLogs).values({
      id: createId(),
      userId,
      action,
      entityType,
      entityId,
      oldValue,
      newValue,
      ipAddress,
      userAgent,
    });
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
}

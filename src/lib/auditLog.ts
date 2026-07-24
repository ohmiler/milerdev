import { db } from '@/lib/db';
import { auditLogs } from '@/lib/db/schema';
import { createId } from '@paralleldrive/cuid2';
import { headers } from 'next/headers';
import { getClientIPFromHeaders } from '@/lib/rate-limit';

export interface AuditLogParams {
  userId: string;
  action: 'create' | 'update' | 'delete';
  entityType: string;
  entityId?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
}

export interface AuditContext {
  ipAddress: string | null;
  userAgent: string | null;
}

export async function getAuditContext(): Promise<AuditContext> {
  const headersList = await headers();
  return {
    ipAddress: getClientIPFromHeaders(headersList),
    userAgent: headersList.get('user-agent') || null,
  };
}

export function createAuditLogValues(
  {
    userId,
    action,
    entityType,
    entityId = null,
    oldValue = null,
    newValue = null,
  }: AuditLogParams,
  context: AuditContext,
) {
  return {
    id: createId(),
    userId,
    action,
    entityType,
    entityId,
    oldValue,
    newValue,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  };
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
    const context = await getAuditContext();
    await db.insert(auditLogs).values(createAuditLogValues({
      userId,
      action,
      entityType,
      entityId,
      oldValue,
      newValue,
    }, context));
  } catch {
    console.error('Failed to write audit log');
  }
}

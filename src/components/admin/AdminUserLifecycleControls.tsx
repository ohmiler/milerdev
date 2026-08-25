'use client';

import type { ReactNode } from 'react';

import { AdminStatusBadge } from '@/components/admin/ui/AdminOperations';
import { Button } from '@/components/ui/button';
import {
  getLifecyclePresentation,
  type AdminUserLifecycleStatus,
} from '@/lib/admin-user-lifecycle-ui';

export function AdminUserLifecycleBadge({
  status,
  detail,
}: {
  status: AdminUserLifecycleStatus;
  detail?: ReactNode;
}) {
  const lifecycle = getLifecyclePresentation(status);
  return (
    <div className="flex flex-col items-start gap-1">
      <AdminStatusBadge tone={lifecycle.tone}>{lifecycle.badgeLabel}</AdminStatusBadge>
      {detail ? <div className="text-xs text-muted-foreground">{detail}</div> : null}
    </div>
  );
}

export function AdminUserLifecycleAction({
  status,
  pending,
  onRequest,
}: {
  status: AdminUserLifecycleStatus;
  pending: boolean;
  onRequest: () => void;
}) {
  const lifecycle = getLifecyclePresentation(status);
  return (
    <Button
      type="button"
      size="sm"
      variant={lifecycle.action === 'deactivate' ? 'destructive' : 'outline'}
      onClick={onRequest}
      disabled={pending}
      aria-label={`${lifecycle.actionLabel}บัญชี`}
    >
      {pending ? 'กำลังบันทึก...' : lifecycle.actionLabel}
    </Button>
  );
}

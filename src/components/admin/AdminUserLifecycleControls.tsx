'use client';

import type { ReactNode } from 'react';

import { AdminPill } from '@/components/admin/ui/AdminPrimitives';
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
    <div className="admin-user-lifecycle-badge">
      <AdminPill tone={lifecycle.tone}>{lifecycle.badgeLabel}</AdminPill>
      {detail ? <div className="admin-users-status-time">{detail}</div> : null}
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
    <button
      type="button"
      className={`admin-users-lifecycle-action admin-users-lifecycle-action--${lifecycle.action}`}
      onClick={onRequest}
      disabled={pending}
      aria-label={`${lifecycle.actionLabel}บัญชี`}
    >
      {pending ? 'กำลังบันทึก...' : lifecycle.actionLabel}
    </button>
  );
}

'use client';

import { KeyRound, MoreHorizontal, Pencil, UserRound } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Spinner } from '@/components/ui/spinner';
import {
  getLifecyclePresentation,
  type AdminUserLifecycleStatus,
} from '@/lib/users/admin-lifecycle-ui';

// One step per row, like the course list; the password and the account status sit in the "⋯" menu.
export function AdminUserRowActions({
  user,
  pending,
  onEdit,
  onResetPassword,
  onLifecycle,
}: {
  user: { id: string; name: string | null; email: string; lifecycleStatus: AdminUserLifecycleStatus };
  pending: boolean;
  onEdit: () => void;
  onResetPassword: () => void;
  onLifecycle: () => void;
}) {
  const lifecycle = getLifecyclePresentation(user.lifecycleStatus);
  return (
    <div className="flex items-center justify-end gap-2 max-md:justify-start">
      <Button type="button" variant="outline" size="sm" onClick={onEdit}>
        <Pencil data-icon="inline-start" aria-hidden="true" />
        แก้ไข
      </Button>
      {/* Not modal: the password and deactivation dialogs open from this menu and must get the page back afterwards. */}
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button type="button" size="icon-sm" variant="outline" disabled={pending} aria-label={`จัดการเพิ่มเติม: ${user.name || user.email}`}>
            {pending ? <Spinner aria-hidden="true" /> : <MoreHorizontal aria-hidden="true" />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem asChild>
            <Link href={`/admin/users/${user.id}`}><UserRound aria-hidden="true" />ดูประวัติผู้เรียน</Link>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onResetPassword}><KeyRound aria-hidden="true" />ตั้งรหัสผ่านใหม่</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant={lifecycle.action === 'deactivate' ? 'destructive' : 'default'}
            data-action={lifecycle.action}
            onSelect={onLifecycle}
          >
            {lifecycle.actionLabel}บัญชี
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

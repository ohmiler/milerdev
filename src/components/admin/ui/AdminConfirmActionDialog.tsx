'use client';

import { CircleAlert } from 'lucide-react';
import type { ReactNode } from 'react';

import { AdminPendingLabel } from '@/components/admin/ui/AdminOperations';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type AdminConfirmActionDialogProps = {
  open: boolean;
  title: ReactNode;
  description: ReactNode;
  target?: ReactNode;
  confirmLabel: ReactNode;
  cancelLabel?: ReactNode;
  pendingLabel?: ReactNode;
  pending?: boolean;
  error?: ReactNode;
  destructive?: boolean;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
};

export function AdminConfirmActionDialog({
  open,
  title,
  description,
  target,
  confirmLabel,
  cancelLabel = 'ยกเลิก',
  pendingLabel = 'กำลังดำเนินการ',
  pending = false,
  error,
  destructive = true,
  onConfirm,
  onOpenChange,
}: AdminConfirmActionDialogProps) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!pending) onOpenChange(nextOpen);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia>
            <CircleAlert aria-hidden />
          </AlertDialogMedia>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        {target ? (
          <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm font-medium text-foreground">{target}</div>
        ) : null}

        {error ? (
          <Alert variant="destructive">
            <CircleAlert aria-hidden />
            <AlertTitle>ดำเนินการไม่สำเร็จ</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            variant={destructive ? 'destructive' : 'default'}
            disabled={pending}
            onClick={(event) => {
              event.preventDefault();
              onConfirm();
            }}
          >
            {pending ? <AdminPendingLabel>{pendingLabel}</AdminPendingLabel> : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

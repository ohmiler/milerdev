'use client';

import { useId, useState } from 'react';
import type { ReactNode } from 'react';
import { AdminConfirmActionDialog } from '@/components/admin/ui/AdminConfirmActionDialog';
import { Textarea } from '@/components/ui/textarea';

export function AdminEnrollmentAccessDialog({
  open, restoring, target, pending, error, onConfirm, onOpenChange,
}: {
  open: boolean; restoring: boolean; target: ReactNode; pending: boolean;
  error?: string; onConfirm: (reason: string) => void; onOpenChange: (open: boolean) => void;
}) {
  const [reason, setReason] = useState('');
  const [validationError, setValidationError] = useState('');
  const id = useId();
  return (
    <AdminConfirmActionDialog
      open={open}
      title={restoring ? 'คืนสิทธิ์เรียน' : 'ถอนสิทธิ์เรียน'}
      description={restoring
        ? 'ผู้เรียนจะกลับมาเรียนต่อจากความคืบหน้าเดิมได้'
        : 'ผู้เรียนจะเข้าเรียนไม่ได้จนกว่าผู้ดูแลจะคืนสิทธิ์ ความคืบหน้าและใบรับรองเดิมจะยังคงอยู่'}
      target={target}
      confirmLabel={restoring ? 'ยืนยันคืนสิทธิ์' : 'ยืนยันถอนสิทธิ์'}
      destructive={!restoring}
      pending={pending}
      error={error || validationError}
      onOpenChange={onOpenChange}
      onConfirm={() => {
        if (reason.trim().length < 5 || reason.trim().length > 500) {
          setValidationError('กรุณาระบุเหตุผล 5–500 ตัวอักษร');
          return;
        }
        setValidationError('');
        onConfirm(reason.trim());
      }}
    >
      <div className="grid gap-2">
        <label htmlFor={id} className="text-sm font-medium">เหตุผลในการเปลี่ยนสิทธิ์</label>
        <Textarea id={id} value={reason} maxLength={500} disabled={pending} onChange={(event) => setReason(event.target.value)} />
      </div>
    </AdminConfirmActionDialog>
  );
}

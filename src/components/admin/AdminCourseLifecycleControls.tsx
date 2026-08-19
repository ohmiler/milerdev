'use client';

import { useRef } from 'react';

import type {
  CourseLifecycleAction,
  CourseStatus,
} from '@/lib/course-lifecycle';
import DialogShell from '@/components/ui/DialogShell';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import styles from './AdminCourseLifecycleControls.module.css';

type LifecyclePresentation = {
  title: string;
  actionLabel: string;
  confirmLabel: string;
  summary: string;
  impacts: string[];
};

const statusLabels: Record<CourseStatus, string> = {
  draft: 'แบบร่าง',
  published: 'เผยแพร่',
  archived: 'เก็บเข้าคลัง',
};

const actionPresentation: Record<CourseLifecycleAction, LifecyclePresentation> = {
  publish: {
    title: 'เผยแพร่คอร์ส',
    actionLabel: 'เผยแพร่คอร์ส',
    confirmLabel: 'ยืนยันเผยแพร่',
    summary: 'คอร์สจะเปลี่ยนจากแบบร่างเป็นเผยแพร่ และพร้อมให้ผู้ใช้พบเห็นตามช่องทางที่ระบบเปิดไว้',
    impacts: [
      'ตรวจรายละเอียด ราคา และบทเรียนให้เรียบร้อยก่อนเผยแพร่',
      'หลังยืนยัน ระบบจะใช้สถานะที่ตอบกลับจากเซิร์ฟเวอร์เป็นสถานะจริง',
    ],
  },
  archive: {
    title: 'เก็บคอร์สเข้าคลัง',
    actionLabel: 'เก็บเข้าคลัง',
    confirmLabel: 'ยืนยันเก็บเข้าคลัง',
    summary: 'คอร์สจะหยุดแสดงต่อผู้ใช้ใหม่และหยุดรับการขายใหม่ โดยไม่ลบข้อมูลคอร์ส',
    impacts: [
      'ผู้เรียนเดิมยังเข้าเรียนได้ และประวัติการเรียนยังคงอยู่',
      'รายการชำระเงินที่เริ่มไว้จะตรวจสถานะคอร์สอีกครั้งก่อนอนุมัติ',
      'หากคอร์สอยู่ใน Bundle ที่เผยแพร่ ระบบจะไม่อนุญาตให้เก็บเข้าคลังจนกว่าจะนำออกจาก Bundle',
    ],
  },
  restore: {
    title: 'นำคอร์สกลับเป็นแบบร่าง',
    actionLabel: 'นำกลับเป็นแบบร่าง',
    confirmLabel: 'ยืนยันนำกลับ',
    summary: 'คอร์สจะกลับมาเป็นแบบร่างเพื่อให้ตรวจและแก้ไข โดยยังไม่เปิดขายหรือเผยแพร่ทันที',
    impacts: [
      'ข้อมูล บทเรียน ผู้เรียน และประวัติเดิมจะยังคงอยู่',
      'เมื่อตรวจเรียบร้อยแล้ว ต้องกดเผยแพร่อีกครั้งจึงจะเปิดต่อผู้ใช้ใหม่',
    ],
  },
};

const allowedActions: Record<CourseStatus, CourseLifecycleAction[]> = {
  draft: ['publish', 'archive'],
  published: ['archive'],
  archived: ['restore'],
};

export function getCourseLifecyclePresentation(action: CourseLifecycleAction) {
  return actionPresentation[action];
}

export function AdminCourseLifecycleBadge({ status }: { status: CourseStatus }) {
  return (
    <span className={styles.badge} data-course-status={status}>
      {statusLabels[status]}
    </span>
  );
}

export function AdminCourseLifecycleActions({
  status,
  pending,
  onRequest,
}: {
  status: CourseStatus;
  pending: boolean;
  onRequest: (action: CourseLifecycleAction) => void;
}) {
  return (
    <div className={styles.actions} aria-label="เปลี่ยนสถานะคอร์ส">
      {allowedActions[status].map((action) => {
        const presentation = actionPresentation[action];
        return (
          <button
            key={action}
            type="button"
            className={styles.action}
            data-action={action}
            onClick={() => onRequest(action)}
            disabled={pending}
            aria-label={`${presentation.actionLabel}`}
          >
            {pending ? 'กำลังเปลี่ยนสถานะ...' : presentation.actionLabel}
          </button>
        );
      })}
    </div>
  );
}

export function CourseLifecycleDialog({
  isOpen,
  courseTitle,
  action,
  pending,
  error,
  onConfirm,
  onCancel,
}: {
  isOpen: boolean;
  courseTitle: string;
  action: CourseLifecycleAction;
  pending: boolean;
  error?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const presentation = actionPresentation[action];
  const destructive = action === 'archive';

  return (
    <DialogShell
      isOpen={isOpen}
      onClose={onCancel}
      title={presentation.title}
      description={`${courseTitle}: ${presentation.summary}`}
      body={(
        <>
          <ul className={styles.impactList}>
            {presentation.impacts.map((impact) => <li key={impact}>{impact}</li>)}
          </ul>
          {error ? <p className={styles.dialogError} role="alert">{error}</p> : null}
        </>
      )}
      role="alertdialog"
      tone={destructive ? 'warning' : 'info'}
      variant={destructive ? 'destructive' : 'informational'}
      initialFocusRef={cancelButtonRef}
    >
      <button
        ref={cancelButtonRef}
        type="button"
        className={buttonVariants({ variant: 'outline' })}
        onClick={onCancel}
        disabled={pending}
      >
        ยกเลิก
      </button>
      <button
        type="button"
        className={cn(buttonVariants({ variant: destructive ? 'destructive' : 'default' }))}
        onClick={onConfirm}
        disabled={pending}
      >
        {pending ? 'กำลังเปลี่ยนสถานะ...' : presentation.confirmLabel}
      </button>
    </DialogShell>
  );
}

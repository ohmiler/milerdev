'use client';

import { Archive, CircleAlert, Send, Undo2 } from 'lucide-react';

import { AdminStatusBadge } from '@/components/admin/ui/AdminOperations';
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
import { Button } from '@/components/ui/button';
import type { CourseLifecycleAction, CourseStatus } from '@/lib/course-lifecycle';

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
  const tones = { draft: 'warning', published: 'success', archived: 'neutral' } as const;
  return <AdminStatusBadge tone={tones[status]} data-course-status={status}>{statusLabels[status]}</AdminStatusBadge>;
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
    <div className="inline-flex flex-wrap gap-2" aria-label="เปลี่ยนสถานะคอร์ส">
      {allowedActions[status].map((action) => {
        const presentation = actionPresentation[action];
        return (
          <Button
            key={action}
            type="button"
            variant={action === 'publish' ? 'secondary' : action === 'archive' ? 'destructive' : 'outline'}
            size="sm"
            data-action={action}
            onClick={() => onRequest(action)}
            disabled={pending}
            aria-label={presentation.actionLabel}
          >
            {pending ? 'กำลังเปลี่ยนสถานะ...' : presentation.actionLabel}
          </Button>
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
  const presentation = actionPresentation[action];
  const destructive = action === 'archive';
  const Icon = action === 'publish' ? Send : action === 'archive' ? Archive : Undo2;

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => { if (!open && !pending) onCancel(); }}>
      <AlertDialogContent role="alertdialog">
        <AlertDialogHeader>
          <AlertDialogMedia><Icon aria-hidden /></AlertDialogMedia>
          <AlertDialogTitle>{presentation.title}</AlertDialogTitle>
          <AlertDialogDescription>{courseTitle}: {presentation.summary}</AlertDialogDescription>
        </AlertDialogHeader>
        <ul className="grid list-disc gap-2 pl-5 text-sm leading-6 text-muted-foreground">
          {presentation.impacts.map((impact) => <li key={impact}>{impact}</li>)}
        </ul>
        {error ? <Alert variant="destructive"><CircleAlert aria-hidden /><AlertTitle>เปลี่ยนสถานะไม่สำเร็จ</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>ยกเลิก</AlertDialogCancel>
          <AlertDialogAction variant={destructive ? 'destructive' : 'default'} disabled={pending} onClick={(event) => { event.preventDefault(); onConfirm(); }}>
            {pending ? 'กำลังเปลี่ยนสถานะ...' : presentation.confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

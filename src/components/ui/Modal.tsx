'use client';

import { useRef, type RefObject } from 'react';
import { AlertTriangle, Check, Info, X } from 'lucide-react';
import DialogShell from './DialogShell';
import { Button } from '@/components/ui/button';

type ModalTone = 'success' | 'error' | 'info' | 'warning';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  type?: ModalTone;
  buttonText?: string;
  returnFocusRef?: RefObject<HTMLElement | null>;
}

const icons = {
  success: <Check />,
  error: <X />,
  info: <Info />,
  warning: <AlertTriangle />,
};

const fallbackTitles: Record<ModalTone, string> = {
  success: 'ดำเนินการสำเร็จ',
  error: 'เกิดข้อผิดพลาด',
  info: 'ข้อมูล',
  warning: 'โปรดตรวจสอบ',
};

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  type = 'info',
  buttonText,
  returnFocusRef,
}: ModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const resolvedButtonText = buttonText ?? 'ตกลง';

  return (
    <DialogShell
      isOpen={isOpen}
      onClose={onClose}
      title={title ?? fallbackTitles[type]}
      description={children}
      tone={type}
      dismissOnBackdrop
      initialFocusRef={closeButtonRef}
      returnFocusRef={returnFocusRef}
      icon={icons[type]}
    >
      <Button ref={closeButtonRef} type="button" onClick={onClose}>{resolvedButtonText}</Button>
    </DialogShell>
  );
}

'use client';

import { useId, type RefObject } from 'react';
import { AlertTriangle } from 'lucide-react';
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

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  confirmDisabled?: boolean;
  returnFocusRef?: RefObject<HTMLElement | null>;
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'ยืนยัน',
  cancelText = 'ยกเลิก',
  confirmDisabled = false,
  returnFocusRef,
}: ConfirmDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  if (!isOpen) return null;

  if (typeof document === 'undefined') {
    return <div role="alertdialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId} data-tone="error" data-variant="destructive"><h3 id={titleId}>{title}</h3><p id={descriptionId}>{message}</p><Button type="button" variant="outline" onClick={onCancel}>{cancelText}</Button><Button type="button" variant="destructive" onClick={onConfirm} disabled={confirmDisabled}>{confirmText}</Button></div>;
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => { if (!open) onCancel(); }}>
      <AlertDialogContent
        data-tone="error"
        data-variant="destructive"
        onCloseAutoFocus={(event) => {
          if (!returnFocusRef?.current) return;
          event.preventDefault();
          returnFocusRef.current.focus();
        }}
      >
        <AlertDialogHeader>
          <AlertDialogMedia><AlertTriangle /></AlertDialogMedia>
          <AlertDialogTitle id={titleId}>{title}</AlertDialogTitle>
          <AlertDialogDescription id={descriptionId}>{message}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>{cancelText}</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm} disabled={confirmDisabled}>{confirmText}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

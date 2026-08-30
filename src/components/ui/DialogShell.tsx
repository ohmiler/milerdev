'use client';

import { useId, type ReactNode, type RefObject } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

type DialogRole = 'dialog' | 'alertdialog';
type FeedbackTone = 'success' | 'error' | 'info' | 'warning';

interface DialogShellProps {
  isOpen: boolean;
  onClose: () => void;
  title: ReactNode;
  description: ReactNode;
  body?: ReactNode;
  children?: ReactNode;
  role?: DialogRole;
  tone?: FeedbackTone;
  variant?: 'informational' | 'destructive' | 'media';
  dismissOnBackdrop?: boolean;
  initialFocusRef?: RefObject<HTMLButtonElement | null>;
  returnFocusRef?: RefObject<HTMLElement | null>;
  icon?: ReactNode;
  size?: 'default' | 'wide' | 'media';
}

export default function DialogShell({
  isOpen,
  onClose,
  title,
  description,
  body,
  children,
  role = 'dialog',
  tone = 'info',
  variant = 'informational',
  dismissOnBackdrop = false,
  initialFocusRef,
  returnFocusRef,
  icon,
  size = 'default',
}: DialogShellProps) {
  const titleId = useId();
  const descriptionId = useId();
  if (!isOpen) return null;

  if (typeof document === 'undefined') {
    return (
      <div role={role} aria-labelledby={titleId} aria-describedby={descriptionId} aria-modal="true" data-tone={tone} data-variant={variant} data-size={size}>
        <h3 id={titleId}>{title}</h3>
        <div id={descriptionId}>{description}</div>
        {body}
        {children}
      </div>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        role={role}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        data-tone={tone}
        variant={variant === 'informational' ? 'default' : variant}
        size={size}
        className="max-h-[calc(100vh-2rem)] overflow-y-auto"
        onPointerDownOutside={(event) => { if (!dismissOnBackdrop) event.preventDefault(); }}
        onOpenAutoFocus={(event) => {
          if (!initialFocusRef?.current) return;
          event.preventDefault();
          initialFocusRef.current.focus();
        }}
        onCloseAutoFocus={(event) => {
          if (!returnFocusRef?.current) return;
          event.preventDefault();
          returnFocusRef.current.focus();
        }}
      >
        <DialogHeader className={cn(icon && 'items-center text-center sm:items-start sm:text-left')}>
          {icon ? (
            <div className="flex size-12 items-center justify-center rounded-full bg-muted [&_svg]:size-6" aria-hidden="true">
              {icon}
            </div>
          ) : null}
          <DialogTitle id={titleId}>{title}</DialogTitle>
          <DialogDescription asChild>
            <div id={descriptionId} className="text-pretty leading-6">{description}</div>
          </DialogDescription>
        </DialogHeader>
        {body ? <div className="rounded-2xl border bg-muted/35 p-4">{body}</div> : null}
        {children ? <DialogFooter>{children}</DialogFooter> : null}
      </DialogContent>
    </Dialog>
  );
}

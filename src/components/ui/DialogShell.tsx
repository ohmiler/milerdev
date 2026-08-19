'use client';

import { useId, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
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
  title?: ReactNode;
  description: ReactNode;
  body?: ReactNode;
  children?: ReactNode;
  role?: DialogRole;
  tone?: FeedbackTone;
  variant?: 'informational' | 'destructive' | 'media';
  label?: string;
  dismissOnBackdrop?: boolean;
  initialFocusRef?: RefObject<HTMLButtonElement | null>;
  returnFocusRef?: RefObject<HTMLElement | null>;
  icon?: ReactNode;
  size?: 'default' | 'wide' | 'media';
}

const toneClasses: Record<FeedbackTone, string> = {
  success: 'bg-emerald-50 text-emerald-700',
  error: 'bg-destructive/10 text-destructive',
  info: 'bg-primary/10 text-primary',
  warning: 'bg-amber-50 text-amber-700',
};

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
  label,
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
      <div role={role} aria-label={title ? undefined : label} aria-labelledby={title ? titleId : undefined} aria-describedby={descriptionId} aria-modal="true" data-tone={tone} data-variant={variant} data-size={size}>
        {title ? <h3 id={titleId}>{title}</h3> : null}
        <div id={descriptionId}>{description}</div>
        {body}
        {children}
      </div>
    );
  }

  const dialog = (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        role={role}
        aria-label={title ? undefined : label}
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={descriptionId}
        data-tone={tone}
        data-variant={variant}
        data-size={size}
        className={cn(
          'max-h-[calc(100vh-2rem)] overflow-y-auto',
          size === 'wide' && 'sm:max-w-2xl',
          size === 'media' && 'bg-slate-950 p-3 text-white sm:max-w-5xl',
          variant === 'destructive' && 'ring-destructive/20',
        )}
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
            <div className={cn('flex size-12 items-center justify-center rounded-full [&_svg]:size-6', toneClasses[tone])} aria-hidden="true">
              {icon}
            </div>
          ) : null}
          {title ? <DialogTitle id={titleId} className="text-xl leading-snug">{title}</DialogTitle> : null}
          <DialogDescription asChild>
            <div id={descriptionId} className="text-pretty leading-6">{description}</div>
          </DialogDescription>
        </DialogHeader>
        {body ? <div className="rounded-2xl border bg-muted/35 p-4">{body}</div> : null}
        {children ? <DialogFooter>{children}</DialogFooter> : null}
      </DialogContent>
    </Dialog>
  );

  return createPortal(dialog, document.body);
}

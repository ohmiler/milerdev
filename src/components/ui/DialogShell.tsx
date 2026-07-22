'use client';

import type { MouseEvent, ReactNode, RefObject } from 'react';
import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import styles from './Feedback.module.css';

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

const focusableSelector = [
  'button:not(:disabled)',
  'a[href]',
  'input:not(:disabled)',
  'select:not(:disabled)',
  'textarea:not(:disabled)',
  'iframe',
  '[tabindex]',
].join(',');

function focusableElements(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>(focusableSelector))
    .filter((element) => (
      element.tabIndex >= 0
      && !element.hasAttribute('hidden')
      && element.getClientRects().length > 0
    ));
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
  label,
  dismissOnBackdrop = false,
  initialFocusRef,
  returnFocusRef,
  icon,
  size = 'default',
}: DialogShellProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const previousFocus = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const explicitReturnTarget = returnFocusRef?.current;
    const previousOverflow = document.body.style.overflow;
    const panel = panelRef.current;
    document.body.style.overflow = 'hidden';

    const animationFrame = window.requestAnimationFrame(() => {
      const firstControl = panel ? focusableElements(panel)[0] : null;
      (initialFocusRef?.current ?? firstControl ?? panel)?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== 'Tab' || !panel) return;

      const controls = focusableElements(panel);
      if (controls.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }

      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(animationFrame);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      const returnTarget = explicitReturnTarget ?? previousFocus;
      if (returnTarget?.isConnected) returnTarget.focus();
    };
  }, [initialFocusRef, isOpen, returnFocusRef]);

  if (!isOpen) return null;

  const handleBackdrop = (event: MouseEvent<HTMLDivElement>) => {
    if (dismissOnBackdrop && event.target === event.currentTarget) {
      event.preventDefault();
      onClose();
    }
  };

  const dialog = (
    <div
      className={styles.overlay}
      data-tone={tone}
      onMouseDown={handleBackdrop}
    >
      <div
        ref={panelRef}
        className={styles.panel}
        role={role}
        aria-modal={true}
        aria-labelledby={title ? titleId : undefined}
        aria-label={title ? undefined : label}
        aria-describedby={descriptionId}
        data-tone={tone}
        data-variant={variant}
        data-size={size}
        tabIndex={-1}
      >
        <div className={styles.content}>
          {icon ? <div className={styles.icon} aria-hidden={true}>{icon}</div> : null}
          {title ? <h3 className={styles.title} id={titleId}>{title}</h3> : null}
          <div className={styles.body} id={descriptionId}>{description}</div>
          {body ? <div className={styles.taskBody}>{body}</div> : null}
          {children ? <div className={styles.actions}>{children}</div> : null}
        </div>
      </div>
    </div>
  );

  return typeof document === 'undefined'
    ? dialog
    : createPortal(dialog, document.body);
}

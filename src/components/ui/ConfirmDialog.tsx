'use client';

import { useRef } from 'react';
import DialogShell from './DialogShell';
import styles from './Feedback.module.css';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
}

function DestructiveIcon() {
  return (
    <svg className={styles.iconSvg} fill={'none'} stroke={'currentColor'} viewBox={'0 0 24 24'}>
      <path strokeLinecap={'round'} strokeLinejoin={'round'} strokeWidth={2} d={'M12 9v4m0 4h.01M10.3 4.7L2.8 18a2 2 0 001.7 3h15a2 2 0 001.7-3L13.7 4.7a2 2 0 00-3.4 0z'} />
    </svg>
  );
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = '\u0e22\u0e37\u0e19\u0e22\u0e31\u0e19',
  cancelText = '\u0e22\u0e01\u0e40\u0e25\u0e34\u0e01',
}: ConfirmDialogProps) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  return (
    <DialogShell
      isOpen={isOpen}
      onClose={onCancel}
      title={title}
      description={message}
      role={'alertdialog'}
      tone={'error'}
      variant={'destructive'}
      initialFocusRef={cancelButtonRef}
      icon={<DestructiveIcon />}
    >
      <button
        ref={cancelButtonRef}
        type={'button'}
        className={`${styles.button} ${styles.buttonSecondary}`}
        onClick={onCancel}
      >
        {cancelText}
      </button>
      <button
        type={'button'}
        className={`${styles.button} ${styles.buttonDestructive}`}
        onClick={onConfirm}
      >
        {confirmText}
      </button>
    </DialogShell>
  );
}

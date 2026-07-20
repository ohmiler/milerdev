'use client';

import { useRef } from 'react';
import DialogShell from './DialogShell';
import styles from './Feedback.module.css';

type ModalTone = 'success' | 'error' | 'info' | 'warning';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  type?: ModalTone;
  buttonText?: string;
}

function ToneIcon({ tone }: { tone: ModalTone }) {
  if (tone === 'success') {
    return (
      <svg className={styles.iconSvg} fill={'none'} stroke={'currentColor'} viewBox={'0 0 24 24'}>
        <path strokeLinecap={'round'} strokeLinejoin={'round'} strokeWidth={2} d={'M5 13l4 4L19 7'} />
      </svg>
    );
  }

  if (tone === 'error') {
    return (
      <svg className={styles.iconSvg} fill={'none'} stroke={'currentColor'} viewBox={'0 0 24 24'}>
        <path strokeLinecap={'round'} strokeLinejoin={'round'} strokeWidth={2} d={'M6 6l12 12M18 6L6 18'} />
      </svg>
    );
  }

  if (tone === 'warning') {
    return (
      <svg className={styles.iconSvg} fill={'none'} stroke={'currentColor'} viewBox={'0 0 24 24'}>
        <path strokeLinecap={'round'} strokeLinejoin={'round'} strokeWidth={2} d={'M12 9v4m0 4h.01M10.3 4.7L2.8 18a2 2 0 001.7 3h15a2 2 0 001.7-3L13.7 4.7a2 2 0 00-3.4 0z'} />
      </svg>
    );
  }

  return (
    <svg className={styles.iconSvg} fill={'none'} stroke={'currentColor'} viewBox={'0 0 24 24'}>
      <path strokeLinecap={'round'} strokeLinejoin={'round'} strokeWidth={2} d={'M12 11v6m0-10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'} />
    </svg>
  );
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  type = 'info',
  buttonText,
}: ModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const resolvedButtonText = buttonText ?? '\u0e15\u0e01\u0e25\u0e07';

  return (
    <DialogShell
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={children}
      tone={type}
      variant={'informational'}
      label={title ?? resolvedButtonText}
      dismissOnBackdrop
      initialFocusRef={closeButtonRef}
      icon={<ToneIcon tone={type} />}
    >
      <button
        ref={closeButtonRef}
        type={'button'}
        className={`${styles.button} ${styles.buttonPrimary}`}
        onClick={onClose}
      >
        {resolvedButtonText}
      </button>
    </DialogShell>
  );
}

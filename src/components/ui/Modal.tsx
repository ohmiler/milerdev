'use client';

import { useRef } from 'react';
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
}

const icons = {
  success: <Check />,
  error: <X />,
  info: <Info />,
  warning: <AlertTriangle />,
};

export default function Modal({ isOpen, onClose, title, children, type = 'info', buttonText }: ModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const resolvedButtonText = buttonText ?? 'ตกลง';

  return (
    <DialogShell
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={children}
      tone={type}
      label={title ?? resolvedButtonText}
      dismissOnBackdrop
      initialFocusRef={closeButtonRef}
      icon={icons[type]}
    >
      <Button ref={closeButtonRef} type="button" onClick={onClose}>{resolvedButtonText}</Button>
    </DialogShell>
  );
}

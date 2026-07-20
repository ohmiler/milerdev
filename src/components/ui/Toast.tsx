'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import styles from './Feedback.module.css';

export type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

export const TOAST_LIFETIME_MS = 3000;

export function toastRoleFor(type: ToastType): 'alert' | 'status' {
  return type === 'error' ? 'alert' : 'status';
}

let toastId = 0;
let addToastFn: ((message: string, type: ToastType) => void) | null = null;

export function showToast(message: string, type: ToastType = 'info') {
  addToastFn?.(message, type);
}

const toastIcons: Record<ToastType, string> = {
  success: '\u2713',
  error: '\u00d7',
  info: 'i',
};

const notificationsLabel = '\u0e01\u0e32\u0e23\u0e41\u0e08\u0e49\u0e07\u0e40\u0e15\u0e37\u0e2d\u0e19';

export default function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const addToast = useCallback((message: string, type: ToastType) => {
    const id = ++toastId;
    setToasts((current) => [...current, { id, message, type }]);

    const timer = setTimeout(() => {
      timersRef.current.delete(id);
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, TOAST_LIFETIME_MS);
    timersRef.current.set(id, timer);
  }, []);

  useEffect(() => {
    addToastFn = addToast;
    const timers = timersRef.current;
    return () => {
      addToastFn = null;
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, [addToast]);

  if (toasts.length === 0) return null;

  return (
    <div className={styles.toastViewport} aria-label={notificationsLabel}>
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={styles.toast}
          data-tone={toast.type}
          role={toastRoleFor(toast.type)}
          aria-atomic={true}
        >
          <span className={styles.toastIcon} aria-hidden={true}>
            {toastIcons[toast.type]}
          </span>
          <span className={styles.toastMessage}>{toast.message}</span>
        </div>
      ))}
    </div>
  );
}

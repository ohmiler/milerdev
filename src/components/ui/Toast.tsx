'use client';

import { toast } from 'sonner';

export type ToastType = 'success' | 'error' | 'info';
export const TOAST_LIFETIME_MS = 3000;

export function toastRoleFor(type: ToastType): 'alert' | 'status' {
  return type === 'error' ? 'alert' : 'status';
}

export function showToast(message: string, type: ToastType = 'info') {
  toast[type](message, { duration: TOAST_LIFETIME_MS });
}

export default function ToastContainer() {
  return null;
}

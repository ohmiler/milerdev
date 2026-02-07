'use client';

import { useState, useEffect, useCallback } from 'react';

interface Toast {
    id: number;
    message: string;
    type: 'success' | 'error' | 'info';
}

let toastId = 0;
let addToastFn: ((message: string, type: Toast['type']) => void) | null = null;

export function showToast(message: string, type: Toast['type'] = 'info') {
    if (addToastFn) {
        addToastFn(message, type);
    }
}

export default function ToastContainer() {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const addToast = useCallback((message: string, type: Toast['type']) => {
        const id = ++toastId;
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 3000);
    }, []);

    useEffect(() => {
        addToastFn = addToast;
        return () => { addToastFn = null; };
    }, [addToast]);

    if (toasts.length === 0) return null;

    const bgColors = {
        success: '#dcfce7',
        error: '#fef2f2',
        info: '#eff6ff',
    };

    const borderColors = {
        success: '#bbf7d0',
        error: '#fecaca',
        info: '#bfdbfe',
    };

    const textColors = {
        success: '#16a34a',
        error: '#dc2626',
        info: '#2563eb',
    };

    const icons = {
        success: '✓',
        error: '✕',
        info: 'ℹ',
    };

    return (
        <div style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 2000,
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
        }}>
            {toasts.map(toast => (
                <div
                    key={toast.id}
                    style={{
                        background: bgColors[toast.type],
                        border: `1px solid ${borderColors[toast.type]}`,
                        color: textColors[toast.type],
                        padding: '12px 20px',
                        borderRadius: '10px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        minWidth: '250px',
                        animation: 'slideIn 0.3s ease-out',
                    }}
                >
                    <span style={{ fontWeight: 700 }}>{icons[toast.type]}</span>
                    {toast.message}
                </div>
            ))}
            <style>{`@keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
        </div>
    );
}

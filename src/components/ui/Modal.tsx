'use client';

import { useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  type?: 'success' | 'error' | 'info' | 'warning';
  buttonText?: string;
}

export default function Modal({ isOpen, onClose, title, children, type = 'info', buttonText }: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const iconColors = {
    success: '#16a34a',
    error: '#dc2626',
    info: '#2563eb',
    warning: '#f59e0b',
  };

  const bgColors = {
    success: '#dcfce7',
    error: '#fef2f2',
    info: '#eff6ff',
    warning: '#fef3c7',
  };

  const icons = {
    success: (
      <svg style={{ width: '48px', height: '48px' }} fill="none" stroke={iconColors.success} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    error: (
      <svg style={{ width: '48px', height: '48px' }} fill="none" stroke={iconColors.error} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    info: (
      <svg style={{ width: '48px', height: '48px' }} fill="none" stroke={iconColors.info} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    warning: (
      <svg style={{ width: '48px', height: '48px' }} fill="none" stroke={iconColors.warning} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onClose}
    >
      {/* Backdrop */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(4px)',
        }}
      />

      {/* Modal Content */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          background: 'white',
          borderRadius: '16px',
          padding: '32px',
          maxWidth: '400px',
          width: '100%',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          animation: 'modalFadeIn 0.2s ease-out',
        }}
      >
        {/* Icon */}
        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: bgColors[type],
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
        }}>
          {icons[type]}
        </div>

        {/* Title */}
        {title && (
          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: 600,
            textAlign: 'center',
            color: '#1e293b',
            marginBottom: '12px',
          }}>
            {title}
          </h3>
        )}

        {/* Content */}
        <div style={{
          textAlign: 'center',
          color: '#64748b',
          marginBottom: '24px',
          lineHeight: 1.6,
        }}>
          {children}
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            width: '100%',
            padding: '14px 24px',
            background: iconColors[type],
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            fontSize: '1rem',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'opacity 0.2s',
          }}
          onMouseOver={(e) => e.currentTarget.style.opacity = '0.9'}
          onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
        >
          {buttonText || 'ตกลง'}
        </button>
      </div>

      <style>{`
        @keyframes modalFadeIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(-10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

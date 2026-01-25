'use client';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'ยืนยัน',
  cancelText = 'ยกเลิก'
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        maxWidth: '400px',
        width: '90%',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      }}>
        <h3 style={{
          fontSize: '1.25rem',
          fontWeight: 600,
          color: '#1e293b',
          marginBottom: '12px',
        }}>
          {title}
        </h3>
        
        <p style={{
          color: '#64748b',
          lineHeight: 1.6,
          marginBottom: '24px',
        }}>
          {message}
        </p>

        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end',
        }}>
          <button
            onClick={onCancel}
            style={{
              padding: '10px 20px',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: '#64748b',
              backgroundColor: '#f1f5f9',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#e2e8f0';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = '#f1f5f9';
            }}
          >
            {cancelText}
          </button>
          
          <button
            onClick={onConfirm}
            style={{
              padding: '10px 20px',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: 'white',
              backgroundColor: '#ef4444',
              border: '1px solid #ef4444',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#dc2626';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = '#ef4444';
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

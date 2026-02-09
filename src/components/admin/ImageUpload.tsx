'use client';

import { useState, useRef } from 'react';

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  folder?: string;
}

export default function ImageUpload({ value, onChange, folder = 'courses' }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    setError('');
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', folder);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (res.ok && data.url) {
        onChange(data.url);
      } else {
        setError(data.error || 'อัปโหลดไม่สำเร็จ');
      }
    } catch {
      setError('เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  };

  const handleRemove = () => {
    onChange('');
    setError('');
  };

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      {value ? (
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <img
            src={value}
            alt="Preview"
            style={{
              maxWidth: '300px',
              maxHeight: '180px',
              borderRadius: '8px',
              objectFit: 'cover',
              border: '1px solid #e2e8f0',
            }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{
                padding: '6px 12px',
                background: '#f1f5f9',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                fontSize: '0.813rem',
                color: '#475569',
                cursor: 'pointer',
              }}
            >
              เปลี่ยนรูป
            </button>
            <button
              type="button"
              onClick={handleRemove}
              style={{
                padding: '6px 12px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '6px',
                fontSize: '0.813rem',
                color: '#dc2626',
                cursor: 'pointer',
              }}
            >
              ลบรูป
            </button>
          </div>
          <div style={{ marginTop: '6px' }}>
            <input
              type="text"
              value={value}
              readOnly
              style={{
                width: '100%',
                padding: '6px 10px',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                fontSize: '0.75rem',
                color: '#94a3b8',
                background: '#f8fafc',
              }}
            />
          </div>
        </div>
      ) : (
        <div
          onClick={() => !uploading && fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          style={{
            border: `2px dashed ${dragOver ? '#2563eb' : '#e2e8f0'}`,
            borderRadius: '12px',
            padding: '32px 24px',
            textAlign: 'center',
            cursor: uploading ? 'wait' : 'pointer',
            background: dragOver ? '#eff6ff' : '#fafafa',
            transition: 'all 0.2s',
          }}
        >
          {uploading ? (
            <div>
              <div style={{
                width: '32px',
                height: '32px',
                border: '3px solid #e2e8f0',
                borderTop: '3px solid #2563eb',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 12px',
              }} />
              <p style={{ color: '#64748b', fontSize: '0.875rem', margin: 0 }}>กำลังอัปโหลด...</p>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📷</div>
              <p style={{ color: '#475569', fontSize: '0.875rem', margin: '0 0 4px' }}>
                คลิกหรือลากไฟล์มาวาง
              </p>
              <p style={{ color: '#94a3b8', fontSize: '0.75rem', margin: 0 }}>
                JPG, PNG, WEBP, GIF (สูงสุด 10MB)
              </p>
            </div>
          )}
        </div>
      )}

      {error && (
        <p style={{ color: '#dc2626', fontSize: '0.813rem', marginTop: '8px' }}>{error}</p>
      )}
    </div>
  );
}

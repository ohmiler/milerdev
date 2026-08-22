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
              border: '1px solid var(--border)',
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
                background: 'var(--muted)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                fontSize: '0.813rem',
                color: 'var(--muted-foreground)',
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
                background: 'var(--color-error-soft)',
                border: '1px solid var(--color-error-soft)',
                borderRadius: '6px',
                fontSize: '0.813rem',
                color: 'var(--color-error-strong)',
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
                border: '1px solid var(--border)',
                borderRadius: '6px',
                fontSize: '0.75rem',
                color: 'var(--muted-foreground)',
                background: 'var(--muted)',
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
            border: `2px dashed ${dragOver ? 'var(--primary)' : 'var(--border)'}`,
            borderRadius: '18px',
            padding: '38px 24px',
            textAlign: 'center',
            cursor: uploading ? 'wait' : 'pointer',
            background: dragOver ? 'var(--secondary)' : 'var(--card)',
            transition: 'all 0.2s',
            outline: dragOver ? '3px solid color-mix(in oklch, var(--ring) 24%, transparent)' : 'none',
          }}
        >
          {uploading ? (
            <div>
              <div className="admin-upload-spinner" style={{
                width: '32px',
                height: '32px',
                border: '3px solid var(--border)',
                borderTop: '3px solid var(--primary)',
                borderRadius: '50%',
                margin: '0 auto 12px',
              }} />
              <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem', margin: 0 }}>กำลังอัปโหลด...</p>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📷</div>
              <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem', margin: '0 0 4px' }}>
                คลิกหรือลากไฟล์มาวาง
              </p>
              <p style={{ color: 'var(--muted-foreground)', fontSize: '0.75rem', margin: 0 }}>
                JPG, PNG, WEBP, GIF (สูงสุด 10MB)
              </p>
            </div>
          )}
        </div>
      )}

      {error && (
        <p style={{ color: 'var(--color-error-strong)', fontSize: '0.813rem', marginTop: '8px' }}>{error}</p>
      )}
    </div>
  );
}

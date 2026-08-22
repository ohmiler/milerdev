'use client';

import Image from 'next/image';
import { useRef, useState } from 'react';
import { ImageIcon, RefreshCw, Trash2, UploadCloud } from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

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

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) handleUpload(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);
    const file = event.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  };

  const handleRemove = () => {
    onChange('');
    setError('');
  };

  return (
    <div className="space-y-3">
      <Input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileSelect}
        className="sr-only"
        tabIndex={-1}
      />

      {value ? (
        <div className="space-y-3">
          <div className="relative aspect-video max-w-md overflow-hidden rounded-xl border border-border bg-muted">
            <Image src={value} alt="ตัวอย่างรูปภาพ" fill unoptimized sizes="448px" className="object-cover" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              <RefreshCw aria-hidden />
              เปลี่ยนรูป
            </Button>
            <Button type="button" variant="destructive" size="sm" onClick={handleRemove}>
              <Trash2 aria-hidden />
              ลบรูป
            </Button>
          </div>
          <Input value={value} readOnly className="text-xs text-muted-foreground" aria-label="URL รูปภาพ" />
        </div>
      ) : (
        <div
          role="button"
          tabIndex={uploading ? -1 : 0}
          aria-disabled={uploading}
          className={cn(
            'grid min-h-44 cursor-pointer place-items-center rounded-xl border-2 border-dashed border-border bg-muted/20 p-6 text-center transition-colors outline-none hover:border-primary/40 hover:bg-muted/35 focus-visible:ring-2 focus-visible:ring-ring',
            dragOver && 'border-primary bg-primary/5 ring-2 ring-primary/15',
            uploading && 'cursor-wait opacity-70',
          )}
          onClick={() => {
            if (!uploading) fileInputRef.current?.click();
          }}
          onKeyDown={(event) => {
            if (!uploading && (event.key === 'Enter' || event.key === ' ')) {
              event.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          onDragOver={(event) => {
            event.preventDefault();
            if (!uploading) setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          {uploading ? (
            <div>
              <Spinner className="mx-auto size-7" aria-hidden />
              <p className="mt-3 text-sm font-medium text-foreground">กำลังอัปโหลด...</p>
              <p className="mt-1 text-xs text-muted-foreground">โปรดรอจนกว่าการอัปโหลดจะเสร็จ</p>
            </div>
          ) : (
            <div>
              <span className="mx-auto grid size-10 place-items-center rounded-lg border border-border bg-card">
                {dragOver ? <ImageIcon className="size-5 text-primary" aria-hidden /> : <UploadCloud className="size-5 text-muted-foreground" aria-hidden />}
              </span>
              <p className="mt-3 text-sm font-medium text-foreground">คลิกหรือลากไฟล์มาวาง</p>
              <p className="mt-1 text-xs text-muted-foreground">JPG, PNG, WEBP, GIF สูงสุด 10MB</p>
            </div>
          )}
        </div>
      )}

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}

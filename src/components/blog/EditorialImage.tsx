'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

interface EditorialImageProps {
  src: string | null;
  alt: string;
  width: number;
  height: number;
  className?: string;
  loading?: 'eager' | 'lazy';
}

export default function EditorialImage({
  src,
  alt,
  width,
  height,
  className,
  loading = 'lazy',
}: EditorialImageProps) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  if (!src || status === 'error') {
    return (
      <div
        className={cn(
          'flex size-full min-h-36 flex-col items-center justify-center gap-2 bg-[var(--academy-navy)] p-5 text-center text-white',
          className,
        )}
        role={'img'}
        aria-label={src ? `ไม่สามารถแสดงภาพประกอบ: ${alt}` : 'ภาพประกอบ MilerDev'}
        data-image-state={src ? 'error' : 'empty'}
      >
        <strong className={'text-2xl'}>MD</strong>
        {src ? <span className={'text-xs text-white/70'}>ไม่สามารถแสดงภาพประกอบ</span> : null}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading={loading}
      decoding={'async'}
      className={className}
      onLoad={() => setStatus('ready')}
      onError={() => setStatus('error')}
      aria-busy={status === 'loading' || undefined}
      data-image-state={status}
    />
  );
}

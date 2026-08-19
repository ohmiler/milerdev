'use client';

import { useEffect, useState } from 'react';

export default function ReadingProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const updateProgress = () => {
      const scrollTop = window.scrollY;
      const documentHeight = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(documentHeight > 0 ? Math.min(100, (scrollTop / documentHeight) * 100) : 0);
    };

    window.addEventListener('scroll', updateProgress, { passive: true });
    updateProgress();
    return () => window.removeEventListener('scroll', updateProgress);
  }, []);

  return (
    <div
      className="fixed inset-x-0 top-0 z-[70] h-1 bg-transparent"
      role={'progressbar'}
      aria-label={'ความคืบหน้าการอ่าน'}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress)}
    >
      <div className="h-full bg-primary transition-[width] duration-100 motion-reduce:transition-none" style={{ width: `${progress}%` }} />
    </div>
  );
}

'use client';

import { useRef, useState } from 'react';
import BunnyPlayer from '@/components/video/BunnyPlayer';
import DialogShell from '@/components/ui/DialogShell';
import { Button } from '@/components/ui/button';

interface CoursePreviewVideoProps {
  previewVideoUrl: string;
}

export default function CoursePreviewVideo({ previewVideoUrl }: CoursePreviewVideoProps) {
  const [showModal, setShowModal] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <button
        ref={triggerRef}
        type={'button'}
        className="group absolute inset-0 z-10 grid cursor-pointer place-items-center border-0 bg-slate-950/45 text-white transition-colors hover:bg-slate-950/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary motion-reduce:transition-none"
        onClick={() => setShowModal(true)}
        aria-label={'ดูวิดีโอตัวอย่างคอร์ส'}
      >
        <span className="grid size-16 place-items-center rounded-full border border-white/50 bg-background/95 text-primary shadow-lg transition-transform group-hover:scale-105 motion-reduce:transition-none" aria-hidden={true}>
          <svg className="size-7 fill-current" viewBox={'0 0 24 24'}>
            <path d={'M8 5v14l11-7z'} />
          </svg>
        </span>
        <span className="absolute bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-white/30 bg-slate-950/80 px-3 py-1.5 text-xs font-semibold">ดูตัวอย่างคอร์ส</span>
      </button>

      <DialogShell
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={'วิดีโอตัวอย่างคอร์ส'}
        description={'ดูเนื้อหาและรูปแบบการสอนก่อนตัดสินใจสมัครเรียน'}
        body={<BunnyPlayer videoId={previewVideoUrl} autoplay className="overflow-hidden rounded-none" />}
        variant={'media'}
        size={'media'}
        dismissOnBackdrop={true}
        initialFocusRef={closeButtonRef}
        returnFocusRef={triggerRef}
      >
        <Button
          ref={closeButtonRef}
          type={'button'}
          variant="secondary"
          onClick={() => setShowModal(false)}
        >
          ปิดตัวอย่าง
        </Button>
      </DialogShell>
    </>
  );
}

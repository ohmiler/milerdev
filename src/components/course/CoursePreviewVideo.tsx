'use client';

import { useRef, useState } from 'react';
import { Play } from 'lucide-react';
import BunnyPlayer from '@/components/video/BunnyPlayer';
import DialogShell from '@/components/ui/DialogShell';
import { Badge } from '@/components/ui/badge';
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
      <Button
        ref={triggerRef}
        type={'button'}
        variant="ghost"
        className="group absolute inset-0 z-10 grid h-auto w-full place-items-center rounded-none bg-background/45 whitespace-normal hover:bg-background/65"
        onClick={() => setShowModal(true)}
        aria-label={'ดูวิดีโอตัวอย่างคอร์ส'}
      >
        <span className="grid size-16 place-items-center rounded-full border bg-background/95 text-primary shadow-lg transition-transform group-hover:scale-105 motion-reduce:transition-none" aria-hidden={true}>
          <Play data-icon="inline-start" fill="currentColor" />
        </span>
        <Badge className="absolute bottom-4 left-1/2 -translate-x-1/2" variant="secondary">ดูตัวอย่างคอร์ส</Badge>
      </Button>

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

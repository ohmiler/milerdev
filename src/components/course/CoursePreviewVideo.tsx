'use client';

import { useRef, useState } from 'react';
import { Play, X } from 'lucide-react';
import BunnyPlayer from '@/components/video/BunnyPlayer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface CoursePreviewVideoProps {
  previewVideoUrl: string;
}

export default function CoursePreviewVideo({ previewVideoUrl }: CoursePreviewVideoProps) {
  const [showModal, setShowModal] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  return (
    <Dialog open={showModal} onOpenChange={setShowModal}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="coursePreview"
          className="group absolute inset-0 z-10 grid h-auto w-full place-items-center rounded-none whitespace-normal"
          aria-label="ดูวิดีโอตัวอย่างคอร์ส"
        >
          <span className="grid size-16 place-items-center rounded-full border bg-background/95 text-primary shadow-lg transition-transform group-hover:scale-105 motion-reduce:transition-none" aria-hidden="true">
            <Play data-icon="inline-start" fill="currentColor" />
          </span>
          <Badge className="absolute bottom-4 left-1/2 -translate-x-1/2" variant="secondary">ดูตัวอย่างคอร์ส</Badge>
        </Button>
      </DialogTrigger>

      <DialogContent
        size="media"
        showCloseButton={false}
        className="w-[calc(100%-2rem)] gap-0 rounded-2xl p-0 sm:max-w-[min(64rem,calc((100dvh-10rem)*16/9))]"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          closeButtonRef.current?.focus();
        }}
      >
        <div className="flex items-start justify-between gap-4 p-4 sm:p-5">
          <DialogHeader className="min-w-0 gap-2">
            <DialogTitle>วิดีโอตัวอย่างคอร์ส</DialogTitle>
            <DialogDescription>ดูเนื้อหาและรูปแบบการสอนก่อนตัดสินใจสมัครเรียน</DialogDescription>
          </DialogHeader>
          <DialogClose asChild>
            <Button ref={closeButtonRef} type="button" variant="ghost" size="icon" className="shrink-0" aria-label="ปิดตัวอย่าง">
              <X aria-hidden="true" />
            </Button>
          </DialogClose>
        </div>
        {showModal && <BunnyPlayer videoId={previewVideoUrl} autoplay className="rounded-none" />}
      </DialogContent>
    </Dialog>
  );
}

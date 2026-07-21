'use client';

import { useRef, useState } from 'react';
import BunnyPlayer from '@/components/video/BunnyPlayer';
import DialogShell from '@/components/ui/DialogShell';
import styles from './CoursePreviewVideo.module.css';

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
        className={styles.trigger}
        onClick={() => setShowModal(true)}
        aria-label={'ดูวิดีโอตัวอย่างคอร์ส'}
      >
        <span className={styles.playMark} aria-hidden={true}>
          <svg viewBox={'0 0 24 24'}>
            <path d={'M8 5v14l11-7z'} />
          </svg>
        </span>
        <span className={styles.triggerLabel}>ดูตัวอย่างคอร์ส</span>
      </button>

      <DialogShell
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={'วิดีโอตัวอย่างคอร์ส'}
        description={'ดูเนื้อหาและรูปแบบการสอนก่อนตัดสินใจสมัครเรียน'}
        body={<BunnyPlayer videoId={previewVideoUrl} autoplay className={styles.player} />}
        variant={'media'}
        size={'media'}
        dismissOnBackdrop={true}
        initialFocusRef={closeButtonRef}
        returnFocusRef={triggerRef}
      >
        <button
          ref={closeButtonRef}
          type={'button'}
          className={styles.closeButton}
          onClick={() => setShowModal(false)}
        >
          ปิดตัวอย่าง
        </button>
      </DialogShell>
    </>
  );
}

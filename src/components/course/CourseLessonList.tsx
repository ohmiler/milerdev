'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface Lesson {
  id: string;
  title: string;
  videoDuration: number | null;
  isFreePreview: boolean | null;
}

interface CourseLessonListProps {
  lessons: Lesson[];
  courseSlug: string;
  courseId: string;
  isEnrolled?: boolean;
}

const INITIAL_SHOW = 10;

function LockIcon() {
  return (
    <svg className="size-3.5" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  );
}

export default function CourseLessonList({ lessons, courseSlug, isEnrolled = false }: CourseLessonListProps) {
  const session = useSession()?.data;
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const hasMore = lessons.length > INITIAL_SHOW;
  const visibleLessons = showAll ? lessons : lessons.slice(0, INITIAL_SHOW);

  const handleLessonClick = (lesson: Lesson) => {
    if (lesson.isFreePreview || isEnrolled) {
      router.push(`/courses/${courseSlug}/learn/${lesson.id}`);
    } else if (!session) {
      router.push(`/login?callbackUrl=/courses/${courseSlug}`);
    } else {
      setShowModal(true);
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds || seconds <= 0) return null;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs} วินาที`;
    if (secs === 0) return `${mins} นาที`;
    return `${mins} นาที ${secs} วินาที`;
  };

  if (lessons.length === 0) {
    return <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground"><p>กำลังเตรียมเนื้อหา โปรดกลับมาตรวจสอบอีกครั้ง</p></div>;
  }

  return (
    <div>
      <ol className="divide-y rounded-xl border bg-card">
        {visibleLessons.map((lesson, index) => {
          const duration = formatDuration(lesson.videoDuration);
          return (
            <li key={lesson.id}>
              <button
                type="button"
                className="grid min-h-16 w-full grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 text-left transition hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                onClick={() => handleLessonClick(lesson)}
                aria-label={`${lesson.title}, ${lesson.isFreePreview ? 'ดูฟรี' : isEnrolled ? 'เปิดบทเรียน' : 'ต้องสมัครเรียนก่อน'}`}
              >
                <span className="text-center font-mono text-xs text-muted-foreground">{String(index + 1).padStart(2, '0')}</span>
                <span className="min-w-0"><strong className="line-clamp-2 block text-sm leading-5">{lesson.title}</strong>{duration && <span className="mt-1 block text-xs text-muted-foreground">{duration}</span>}
                </span>
                {lesson.isFreePreview ? (
                  <Badge variant="secondary">ดูฟรี</Badge>
                ) : isEnrolled ? (
                  <Badge>เปิดบทเรียน</Badge>
                ) : (
                  <Badge className="gap-1" variant="outline"><LockIcon /> ล็อก</Badge>
                )}
              </button>
            </li>
          );
        })}
      </ol>

      {hasMore && (
        <Button type="button" variant="outline" className="mt-4 w-full" onClick={() => setShowAll((current) => !current)} aria-expanded={showAll}>
          {showAll ? 'ย่อรายการบทเรียน' : `ดูอีก ${lessons.length - INITIAL_SHOW} บทเรียน`}
        </Button>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} type="warning" title="สมัครเรียนเพื่อเปิดบทนี้" buttonText="รับทราบ">
        บทเรียนนี้เปิดสำหรับผู้ที่สมัครคอร์สแล้ว คุณสามารถดูหัวข้อที่เปิดให้ทดลองได้ก่อนตัดสินใจ
      </Modal>
    </div>
  );
}

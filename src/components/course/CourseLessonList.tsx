'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';
import { BookOpen, Lock } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';

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

export default function CourseLessonList({ lessons, courseSlug, isEnrolled = false }: CourseLessonListProps) {
  const session = useSession()?.data;
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [freeOnly, setFreeOnly] = useState(false);
  const listId = useId();
  const freePreviewCount = lessons.filter((lesson) => lesson.isFreePreview).length;
  const filterActive = freeOnly && freePreviewCount > 0;
  const hasMore = !filterActive && lessons.length > INITIAL_SHOW;
  const indexedLessons = lessons.map((lesson, index) => ({ lesson, index }));
  const visibleLessons = filterActive
    ? indexedLessons.filter(({ lesson }) => lesson.isFreePreview)
    : showAll ? indexedLessons : indexedLessons.slice(0, INITIAL_SHOW);

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
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon"><BookOpen aria-hidden="true" /></EmptyMedia>
          <EmptyTitle>กำลังเตรียมเนื้อหา</EmptyTitle>
          <EmptyDescription>โปรดกลับมาตรวจสอบรายการบทเรียนอีกครั้ง</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div>
      {freePreviewCount > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Toggle size="sm" variant="outline" pressed={filterActive} onPressedChange={setFreeOnly} aria-controls={listId}>
            ดูเฉพาะ {freePreviewCount} บทฟรี
          </Toggle>
          <p className="text-xs text-muted-foreground" role="status">{filterActive ? 'แสดงบททดลองเรียนฟรีทั้งหมด' : 'เลือกดูบททดลองก่อนสมัครเรียนได้'}</p>
        </div>
      )}
      <ol id={listId} className="divide-y overflow-hidden rounded-xl border bg-card">
        {visibleLessons.map(({ lesson, index }) => {
          const duration = formatDuration(lesson.videoDuration);
          return (
            <li key={lesson.id} value={index + 1}>
              <Button
                type="button"
                variant="ghost"
                className="grid h-auto min-h-16 w-full grid-cols-[1.5rem_minmax(0,1fr)_auto] justify-normal gap-3 rounded-none px-3 py-3 text-left whitespace-normal focus-visible:ring-inset sm:px-4"
                onClick={() => handleLessonClick(lesson)}
                aria-label={`${lesson.title}, ${lesson.isFreePreview ? 'ดูฟรี' : isEnrolled ? 'เปิดบทเรียน' : 'ต้องสมัครเรียนก่อน'}`}
              >
                <span className="text-center font-mono text-xs text-muted-foreground">{String(index + 1).padStart(2, '0')}</span>
                <span className="min-w-0"><strong className="block text-sm leading-6 font-medium wrap-anywhere">{lesson.title}</strong>{duration && <span className="mt-1 block text-xs text-muted-foreground">{duration}</span>}
                </span>
                {lesson.isFreePreview ? (
                  <Badge variant="secondary">ดูฟรี</Badge>
                ) : isEnrolled ? (
                  <Badge variant="outline">เปิดบทเรียน</Badge>
                ) : (
                  <Badge variant="outline"><Lock data-icon="inline-end" aria-hidden="true" /> ล็อก</Badge>
                )}
              </Button>
            </li>
          );
        })}
      </ol>

      {hasMore && (
        <Button type="button" variant="outline" className="mt-4 w-full" onClick={() => setShowAll((current) => !current)} aria-expanded={showAll} aria-controls={listId}>
          {showAll ? 'ย่อรายการบทเรียน' : `ดูอีก ${lessons.length - INITIAL_SHOW} บทเรียน`}
        </Button>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} type="warning" title="สมัครเรียนเพื่อเปิดบทนี้" buttonText="รับทราบ">
        บทเรียนนี้เปิดสำหรับผู้ที่สมัครคอร์สแล้ว คุณสามารถดูหัวข้อที่เปิดให้ทดลองได้ก่อนตัดสินใจ
      </Modal>
    </div>
  );
}

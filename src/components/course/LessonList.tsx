'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { normalizeLessonSearch } from '@/lib/lesson-search';
import { BookOpen, Check, Lock, SearchX } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';

interface Lesson {
  id: string;
  title: string;
  videoDuration: number | null;
  isFreePreview: boolean | null;
}

interface LessonListProps {
  lessons: Lesson[];
  courseSlug: string;
  currentLessonId?: string;
  isEnrolled?: boolean;
  completedLessonIds?: Set<string>;
  onLockedClick?: (lessonId: string) => void;
  searchQuery?: string;
}

const LESSONS_PER_PAGE = 20;

const formatDuration = (seconds: number | null) => {
  if (!seconds || seconds <= 0) return null;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

export default function LessonList({
  lessons,
  courseSlug,
  currentLessonId,
  isEnrolled = false,
  completedLessonIds,
  onLockedClick,
  searchQuery = '',
}: LessonListProps) {
  const currentItemRef = useRef<HTMLAnchorElement | null>(null);
  const currentLessonPage = useMemo(() => {
    if (!currentLessonId) return 0;
    const index = lessons.findIndex((lesson) => lesson.id === currentLessonId);
    return index >= 0 ? Math.floor(index / LESSONS_PER_PAGE) : 0;
  }, [lessons, currentLessonId]);
  const normalizedSearch = normalizeLessonSearch(searchQuery);
  const isSearching = normalizedSearch !== '';
  const [pagination, setPagination] = useState({ lessonId: currentLessonId, search: normalizedSearch, page: currentLessonPage });
  const filteredLessons = isSearching
    ? lessons.filter((lesson) => normalizeLessonSearch(lesson.title).includes(normalizedSearch))
    : lessons;
  const totalPages = Math.ceil(filteredLessons.length / LESSONS_PER_PAGE);
  const requestedPage = pagination.lessonId === currentLessonId && pagination.search === normalizedSearch
    ? pagination.page : isSearching ? 0 : currentLessonPage;
  const page = Math.max(0, Math.min(requestedPage, totalPages - 1));
  const paginatedLessons = filteredLessons.slice(page * LESSONS_PER_PAGE, (page + 1) * LESSONS_PER_PAGE);

  useEffect(() => {
    currentItemRef.current?.scrollIntoView({ block: 'nearest', behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }, [currentLessonId]);

  if (lessons.length === 0) {
    return (
      <Empty className="border" role="status">
        <EmptyHeader>
          <EmptyMedia variant="icon"><BookOpen aria-hidden="true" /></EmptyMedia>
          <EmptyTitle>ยังไม่มีบทเรียน</EmptyTitle>
          <EmptyDescription>เนื้อหาของคอร์สกำลังอยู่ระหว่างการเตรียมพร้อม</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  if (filteredLessons.length === 0) {
    return (
      <Empty className="border" role="status">
        <EmptyHeader>
          <EmptyMedia variant="icon"><SearchX aria-hidden="true" /></EmptyMedia>
          <EmptyTitle>ไม่พบบทเรียนที่ตรงกับ &ldquo;{searchQuery}&rdquo;</EmptyTitle>
          <EmptyDescription>ลองใช้คำค้นที่สั้นลงหรือสะกดคำใหม่อีกครั้ง</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div>
      <p role="status" aria-live="polite" className="mb-3 text-sm text-muted-foreground">{isSearching ? "ผลการค้นหา" : "ทั้งหมด"} {filteredLessons.length} บท · แสดง {page * LESSONS_PER_PAGE + 1}–{Math.min((page + 1) * LESSONS_PER_PAGE, filteredLessons.length)}</p>
      <ol className="grid gap-2">
        {paginatedLessons.map((lesson) => {
          const originalIndex = lessons.findIndex((item) => item.id === lesson.id);
          const isLocked = !isEnrolled && !lesson.isFreePreview;
          const isCurrent = lesson.id === currentLessonId;
          const isCompleted = completedLessonIds?.has(lesson.id) ?? false;
          const duration = formatDuration(lesson.videoDuration);
          const number = String(originalIndex + 1).padStart(2, '0');

          const itemClassName = 'grid h-auto min-h-16 w-full grid-cols-[2rem_minmax(0,1fr)_auto] justify-normal gap-3 px-3 py-2.5 text-left whitespace-normal';

          const content = (
            <>
              <Badge variant={isCurrent ? 'default' : 'secondary'} className="font-mono">
                {isCompleted ? <Check aria-hidden="true" /> : number}
              </Badge>
              <span className="min-w-0">
                <strong className="block truncate text-sm font-medium text-current">{lesson.title}</strong>
                <small className="mt-1 block text-xs text-muted-foreground">
                  {duration ?? (lesson.isFreePreview && !isEnrolled ? 'ทดลองเรียนฟรี' : `บทที่ ${originalIndex + 1}`)}
                </small>
              </span>
              <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                {isLocked ? <><Lock className="size-3" aria-hidden="true" />ล็อก</> : isCurrent ? 'กำลังเรียน' : isCompleted ? 'จบแล้ว' : 'เปิด'}
              </span>
            </>
          );

          return (
            <li key={lesson.id}>
              {isLocked ? (
                <Button type="button" variant="ghost" className={itemClassName} onClick={() => onLockedClick?.(lesson.id)} aria-label={`บทที่ ${originalIndex + 1} ${lesson.title}, ต้องสมัครเรียนก่อน`}>
                  {content}
                </Button>
              ) : (
                <Button asChild variant={isCurrent ? 'secondary' : 'ghost'} className={itemClassName}>
                  <Link ref={isCurrent ? currentItemRef : null} href={`/courses/${courseSlug}/learn/${lesson.id}`} aria-current={isCurrent ? 'page' : undefined}>
                    {content}
                  </Link>
                </Button>
              )}
            </li>
          );
        })}
      </ol>

      {totalPages > 1 && (
        <nav className="mt-4 flex items-center justify-between gap-3 border-t pt-4" aria-label="หน้ารายการบทเรียน">
          <Button size="icon" className="min-h-11 min-w-11" variant="ghost" type="button" onClick={() => setPagination({ lessonId: currentLessonId, search: normalizedSearch, page: Math.max(0, page - 1) })} disabled={page === 0} aria-label="หน้าบทเรียนก่อนหน้า">
            ←
          </Button>
          <span className="text-xs tabular-nums text-muted-foreground">หน้า {page + 1} / {totalPages}</span>
          <Button size="icon" className="min-h-11 min-w-11" variant="ghost" type="button" onClick={() => setPagination({ lessonId: currentLessonId, search: normalizedSearch, page: Math.min(totalPages - 1, page + 1) })} disabled={page === totalPages - 1} aria-label="หน้าบทเรียนถัดไป">
            →
          </Button>
        </nav>
      )}
    </div>
  );
}

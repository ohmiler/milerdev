'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Check, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const isSearching = normalizedSearch !== '';
  const [pagination, setPagination] = useState({
    lessonId: currentLessonId,
    page: currentLessonPage,
  });
  const page = isSearching
    ? 0
    : pagination.lessonId === currentLessonId
      ? pagination.page
      : currentLessonPage;
  const filteredLessons = isSearching
    ? lessons.filter((lesson) => lesson.title.toLowerCase().includes(normalizedSearch))
    : lessons;
  const totalPages = Math.ceil(filteredLessons.length / LESSONS_PER_PAGE);
  const paginatedLessons = isSearching
    ? filteredLessons
    : filteredLessons.slice(page * LESSONS_PER_PAGE, (page + 1) * LESSONS_PER_PAGE);

  useEffect(() => {
    currentItemRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [currentLessonId]);

  if (lessons.length === 0) {
    return <p className="rounded-xl border border-dashed p-5 text-center text-sm text-muted-foreground">ยังไม่มีบทเรียน</p>;
  }

  if (filteredLessons.length === 0) {
    return (
      <p className="rounded-xl border border-dashed p-5 text-center text-sm text-muted-foreground">
        ไม่พบบทเรียนที่ตรงกับ &ldquo;{searchQuery}&rdquo;
      </p>
    );
  }

  return (
    <div>
      <ol className="grid gap-2">
        {paginatedLessons.map((lesson) => {
          const originalIndex = lessons.findIndex((item) => item.id === lesson.id);
          const isLocked = !isEnrolled && !lesson.isFreePreview;
          const isCurrent = lesson.id === currentLessonId;
          const isCompleted = completedLessonIds?.has(lesson.id) ?? false;
          const duration = formatDuration(lesson.videoDuration);
          const number = String(originalIndex + 1).padStart(2, '0');

          const itemClassName = cn(
            'grid min-h-16 w-full grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            isCurrent
              ? 'border-primary/25 bg-primary/10 text-foreground'
              : 'text-muted-foreground hover:border-border hover:bg-muted/60 hover:text-foreground',
            isLocked && 'text-muted-foreground/75',
          );

          const content = (
            <>
              <span className={cn('flex size-7 items-center justify-center rounded-full bg-muted font-mono text-[11px]', isCurrent && 'bg-primary text-primary-foreground', isCompleted && !isCurrent && 'bg-emerald-50 text-emerald-700')}>
                {isCompleted ? <Check className="size-3.5" aria-hidden="true" /> : number}
              </span>
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
                <button type="button" className={itemClassName} onClick={() => onLockedClick?.(lesson.id)} aria-label={`บทที่ ${originalIndex + 1} ${lesson.title}, ต้องสมัครเรียนก่อน`}>
                  {content}
                </button>
              ) : (
                <Link ref={isCurrent ? currentItemRef : null} href={`/courses/${courseSlug}/learn/${lesson.id}`} className={itemClassName} aria-current={isCurrent ? 'page' : undefined}>
                  {content}
                </Link>
              )}
            </li>
          );
        })}
      </ol>

      {!isSearching && totalPages > 1 && (
        <nav className="mt-4 flex items-center justify-between gap-3 border-t pt-4" aria-label="หน้ารายการบทเรียน">
          <Button size="icon-sm" variant="ghost" type="button" onClick={() => setPagination({ lessonId: currentLessonId, page: Math.max(0, page - 1) })} disabled={page === 0} aria-label="หน้าบทเรียนก่อนหน้า">
            ←
          </Button>
          <span className="text-xs tabular-nums text-muted-foreground">หน้า {page + 1} / {totalPages}</span>
          <Button size="icon-sm" variant="ghost" type="button" onClick={() => setPagination({ lessonId: currentLessonId, page: Math.min(totalPages - 1, page + 1) })} disabled={page === totalPages - 1} aria-label="หน้าบทเรียนถัดไป">
            →
          </Button>
        </nav>
      )}
    </div>
  );
}

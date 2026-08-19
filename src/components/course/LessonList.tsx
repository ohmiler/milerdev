'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
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
    return <p className="rounded-lg border border-dashed border-white/10 p-5 text-center text-sm text-slate-400">ยังไม่มีบทเรียน</p>;
  }

  if (filteredLessons.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-white/10 p-5 text-center text-sm text-slate-400">
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

          return (
            <li key={lesson.id}>
              {isLocked ? (
                <button
                  type="button"
                  className="grid min-h-16 w-full grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-white/5 px-3 py-2 text-left text-slate-500 transition hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                  onClick={() => onLockedClick?.(lesson.id)}
                  aria-label={`บทที่ ${originalIndex + 1} ${lesson.title}, ต้องสมัครเรียนก่อน`}
                >
                  <span className="font-mono text-xs">{number}</span>
                  <span className="min-w-0">
                    <strong className="block truncate text-sm font-medium">{lesson.title}</strong>
                    {duration && <small className="mt-1 block text-xs">{duration}</small>}
                  </span>
                  <span className="flex items-center gap-1 text-xs">
                    <svg className="size-3" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M12 2C9.24 2 7 4.24 7 7v3H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V12c0-1.1-.9-2-2-2h-1V7c0-2.76-2.24-5-5-5zm0 2c1.66 0 3 1.34 3 3v3H9V7c0-1.66 1.34-3 3-3z" />
                    </svg>
                    ล็อก
                  </span>
                </button>
              ) : (
                <Link
                  ref={isCurrent ? currentItemRef : null}
                  href={`/courses/${courseSlug}/learn/${lesson.id}`}
                  className={cn('grid min-h-16 grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-white/5 px-3 py-2 text-slate-300 transition hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400', isCurrent && 'border-primary/50 bg-primary/10 text-white', isCompleted && !isCurrent && 'text-emerald-300')}
                  aria-current={isCurrent ? 'page' : undefined}
                >
                  <span className="font-mono text-xs">{isCompleted ? '✓' : number}</span>
                  <span className="min-w-0">
                    <strong className="block truncate text-sm font-medium">{lesson.title}</strong>
                    {duration && <small className="mt-1 block text-xs text-slate-500">{duration}</small>}
                  </span>
                  <span className="text-xs">
                    {lesson.isFreePreview && !isEnrolled ? 'ฟรี' : isCompleted ? 'จบแล้ว' : isCurrent ? 'กำลังเรียน' : 'เปิด'}
                  </span>
                </Link>
              )}
            </li>
          );
        })}
      </ol>

      {!isSearching && totalPages > 1 && (
        <nav className="mt-4 flex items-center justify-between gap-3" aria-label="หน้ารายการบทเรียน">
          <Button
            size="icon-sm"
            variant="ghost"
            type="button"
            onClick={() => setPagination({
              lessonId: currentLessonId,
              page: Math.max(0, page - 1),
            })}
            disabled={page === 0}
            aria-label="หน้าบทเรียนก่อนหน้า"
          >
            ←
          </Button>
          <span className="text-xs text-slate-400">หน้า {page + 1} / {totalPages}</span>
          <Button
            size="icon-sm"
            variant="ghost"
            type="button"
            onClick={() => setPagination({
              lessonId: currentLessonId,
              page: Math.min(totalPages - 1, page + 1),
            })}
            disabled={page === totalPages - 1}
            aria-label="หน้าบทเรียนถัดไป"
          >
            →
          </Button>
        </nav>
      )}
    </div>
  );
}

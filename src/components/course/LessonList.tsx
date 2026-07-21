'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';

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
    return <p className="lesson-list__empty">ยังไม่มีบทเรียน</p>;
  }

  if (filteredLessons.length === 0) {
    return (
      <p className="lesson-list__empty">
        ไม่พบบทเรียนที่ตรงกับ &ldquo;{searchQuery}&rdquo;
      </p>
    );
  }

  return (
    <div className="lesson-list">
      <ol className="lesson-list__items">
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
                  className="lesson-list__item is-locked"
                  onClick={() => onLockedClick?.(lesson.id)}
                  aria-label={`บทที่ ${originalIndex + 1} ${lesson.title}, ต้องสมัครเรียนก่อน`}
                >
                  <span className="lesson-list__index">{number}</span>
                  <span className="lesson-list__copy">
                    <strong>{lesson.title}</strong>
                    {duration && <small>{duration}</small>}
                  </span>
                  <span className="lesson-list__state">
                    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M12 2C9.24 2 7 4.24 7 7v3H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V12c0-1.1-.9-2-2-2h-1V7c0-2.76-2.24-5-5-5zm0 2c1.66 0 3 1.34 3 3v3H9V7c0-1.66 1.34-3 3-3z" />
                    </svg>
                    ล็อก
                  </span>
                </button>
              ) : (
                <Link
                  ref={isCurrent ? currentItemRef : null}
                  href={`/courses/${courseSlug}/learn/${lesson.id}`}
                  className={`lesson-list__item${isCurrent ? ' is-current' : ''}${isCompleted ? ' is-complete' : ''}`}
                  aria-current={isCurrent ? 'page' : undefined}
                >
                  <span className="lesson-list__index">{isCompleted ? '✓' : number}</span>
                  <span className="lesson-list__copy">
                    <strong>{lesson.title}</strong>
                    {duration && <small>{duration}</small>}
                  </span>
                  <span className="lesson-list__state">
                    {lesson.isFreePreview && !isEnrolled ? 'ฟรี' : isCompleted ? 'จบแล้ว' : isCurrent ? 'กำลังเรียน' : 'เปิด'}
                  </span>
                </Link>
              )}
            </li>
          );
        })}
      </ol>

      {!isSearching && totalPages > 1 && (
        <nav className="lesson-list__pagination" aria-label="หน้ารายการบทเรียน">
          <button
            type="button"
            onClick={() => setPagination({
              lessonId: currentLessonId,
              page: Math.max(0, page - 1),
            })}
            disabled={page === 0}
            aria-label="หน้าบทเรียนก่อนหน้า"
          >
            ←
          </button>
          <span>หน้า {page + 1} / {totalPages}</span>
          <button
            type="button"
            onClick={() => setPagination({
              lessonId: currentLessonId,
              page: Math.min(totalPages - 1, page + 1),
            })}
            disabled={page === totalPages - 1}
            aria-label="หน้าบทเรียนถัดไป"
          >
            →
          </button>
        </nav>
      )}
    </div>
  );
}

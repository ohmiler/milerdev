'use client';

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
}

const formatDuration = (seconds: number | null) => {
  if (!seconds || seconds <= 0) return null;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

export default function LessonList({ lessons, courseSlug, currentLessonId, isEnrolled = false, completedLessonIds, onLockedClick }: LessonListProps) {
  if (lessons.length === 0) {
    return (
      <div style={{
        padding: '40px 20px',
        textAlign: 'center',
        color: '#64748b',
      }}>
        ยังไม่มีบทเรียน
      </div>
    );
  }

  return (
    <>
      {lessons.map((lesson, index) => {
        const isLocked = !isEnrolled && !lesson.isFreePreview;
        const isCurrent = lesson.id === currentLessonId;
        const isCompleted = completedLessonIds?.has(lesson.id) ?? false;

        if (isLocked) {
          return (
            <div
              key={lesson.id}
              onClick={() => onLockedClick?.(lesson.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                borderRadius: '8px',
                color: '#64748b',
                marginBottom: '4px',
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
              onMouseOver={(e) => e.currentTarget.style.background = '#334155'}
              onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: '#475569',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                flexShrink: 0,
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C9.24 2 7 4.24 7 7v3H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V12c0-1.1-.9-2-2-2h-1V7c0-2.76-2.24-5-5-5zm0 2c1.66 0 3 1.34 3 3v3H9V7c0-1.66 1.34-3 3-3zm0 10c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2z"/>
                </svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {lesson.title}
                </div>
                {formatDuration(lesson.videoDuration) && (
                  <div style={{ fontSize: '0.75rem', color: '#475569' }}>
                    {formatDuration(lesson.videoDuration)}
                  </div>
                )}
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
                <path d="M12 2C9.24 2 7 4.24 7 7v3H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V12c0-1.1-.9-2-2-2h-1V7c0-2.76-2.24-5-5-5zm0 2c1.66 0 3 1.34 3 3v3H9V7c0-1.66 1.34-3 3-3z"/>
              </svg>
            </div>
          );
        }

        return (
          <Link
            key={lesson.id}
            href={`/courses/${courseSlug}/learn/${lesson.id}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              borderRadius: '8px',
              textDecoration: 'none',
              color: 'white',
              marginBottom: '4px',
              transition: 'background 0.2s',
              background: isCurrent ? '#334155' : 'transparent',
            }}
            onMouseOver={(e) => e.currentTarget.style.background = '#334155'}
            onMouseOut={(e) => !isCurrent && (e.currentTarget.style.background = 'transparent')}
          >
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: isCompleted ? '#16a34a' : isCurrent ? '#2563eb' : '#334155',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.75rem',
              fontWeight: 600,
              flexShrink: 0,
            }}>
              {isCompleted ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                  <path d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                index + 1
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: '0.875rem',
                fontWeight: 500,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {lesson.title}
              </div>
              {formatDuration(lesson.videoDuration) && (
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  {formatDuration(lesson.videoDuration)}
                </div>
              )}
            </div>
            {lesson.isFreePreview && !isEnrolled && (
              <span style={{
                fontSize: '0.625rem',
                background: '#16a34a',
                color: 'white',
                padding: '2px 6px',
                borderRadius: '4px',
                flexShrink: 0,
              }}>
                ฟรี
              </span>
            )}
          </Link>
        );
      })}
    </>
  );
}

'use client';

import Link from 'next/link';

interface Lesson {
  id: string;
  title: string;
  videoDuration: number | null;
}

interface LessonListProps {
  lessons: Lesson[];
  courseSlug: string;
}

export default function LessonList({ lessons, courseSlug }: LessonListProps) {
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
      {lessons.map((lesson, index) => (
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
          }}
          onMouseOver={(e) => e.currentTarget.style.background = '#334155'}
          onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
        >
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: '#334155',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.75rem',
            fontWeight: 600,
            flexShrink: 0,
          }}>
            {index + 1}
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
            {lesson.videoDuration && lesson.videoDuration > 0 && (
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                {Math.floor(lesson.videoDuration / 60)} นาที
              </div>
            )}
          </div>
        </Link>
      ))}
    </>
  );
}

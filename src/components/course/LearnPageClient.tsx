'use client';

import { useState } from 'react';
import Link from 'next/link';
import LessonList from './LessonList';
import BunnyPlayer from '@/components/video/BunnyPlayer';

interface Lesson {
  id: string;
  title: string;
  videoUrl: string | null;
  videoDuration: number | null;
  isFreePreview: boolean | null;
  content: string | null;
}

interface Course {
  id: string;
  title: string;
  slug: string;
}

interface LearnPageClientProps {
  course: Course;
  currentLesson: Lesson;
  allLessons: Lesson[];
  prevLesson: Lesson | null;
  nextLesson: Lesson | null;
  currentIndex: number;
  isEnrolled: boolean;
}

const formatDuration = (seconds: number | null) => {
  if (!seconds || seconds <= 0) return null;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins} นาที ${secs < 10 ? '0' : ''}${secs} วินาที`;
};

export default function LearnPageClient({
  course,
  currentLesson,
  allLessons,
  prevLesson,
  nextLesson,
  currentIndex,
  isEnrolled,
}: LearnPageClientProps) {
  const [lockedMessage, setLockedMessage] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLockedClick = (lessonId: string) => {
    const lesson = allLessons.find(l => l.id === lessonId);
    setLockedMessage(`บทเรียน "${lesson?.title}" ต้องลงทะเบียนเรียนก่อนจึงจะสามารถดูได้`);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a' }}>
      {/* Header */}
      <header style={{
        background: '#1e293b',
        borderBottom: '1px solid #334155',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link
            href={`/courses/${course.slug}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#94a3b8',
              textDecoration: 'none',
              fontSize: '0.875rem',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            กลับ
          </Link>
          <span style={{ color: '#475569' }}>|</span>
          <span style={{ color: 'white', fontWeight: 500 }}>{course.title}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
            บทที่ {currentIndex + 1} / {allLessons.length}
          </div>
          {/* Mobile sidebar toggle */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex lg:hidden"
            style={{
              alignItems: 'center',
              gap: '6px',
              padding: '8px 12px',
              background: '#334155',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            เนื้อหา
          </button>
        </div>
      </header>

      <div style={{ display: 'flex', minHeight: 'calc(100vh - 57px)' }}>
        {/* Video Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Video Player or Locked Message */}
          <div style={{ width: '100%', aspectRatio: '16/9', background: '#000', position: 'relative', flexShrink: 0 }}>
            {lockedMessage ? (
              <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                color: 'white',
                padding: '40px',
                textAlign: 'center',
              }}>
                <div style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  background: '#334155',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '24px',
                }}>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="#f59e0b">
                    <path d="M12 2C9.24 2 7 4.24 7 7v3H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V12c0-1.1-.9-2-2-2h-1V7c0-2.76-2.24-5-5-5zm0 2c1.66 0 3 1.34 3 3v3H9V7c0-1.66 1.34-3 3-3zm0 10c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2z"/>
                  </svg>
                </div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '12px' }}>
                  🔒 บทเรียนนี้ต้องลงทะเบียน
                </h2>
                <p style={{ color: '#94a3b8', marginBottom: '24px', maxWidth: '400px' }}>
                  {lockedMessage}
                </p>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={() => setLockedMessage(null)}
                    style={{
                      padding: '12px 24px',
                      background: '#334155',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: 500,
                    }}
                  >
                    กลับไปดูบทเรียนปัจจุบัน
                  </button>
                  <Link
                    href={`/courses/${course.slug}`}
                    style={{
                      padding: '12px 24px',
                      background: '#2563eb',
                      color: 'white',
                      textDecoration: 'none',
                      borderRadius: '8px',
                      fontWeight: 500,
                    }}
                  >
                    ลงทะเบียนเรียน
                  </Link>
                </div>
              </div>
            ) : currentLesson.videoUrl ? (
              <BunnyPlayer videoId={currentLesson.videoUrl} />
            ) : (
              <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748b',
              }}>
                ไม่มีวิดีโอสำหรับบทเรียนนี้
              </div>
            )}
          </div>

          {/* Lesson Info */}
          <div style={{ padding: '24px', flex: 1, overflowY: 'auto', background: '#0f172a' }}>
            <h1 style={{
              fontSize: '1.5rem',
              fontWeight: 600,
              color: 'white',
              marginBottom: '8px',
            }}>
              {currentLesson.title}
            </h1>

            {formatDuration(currentLesson.videoDuration) && (
              <div style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '16px' }}>
                ⏱️ {formatDuration(currentLesson.videoDuration)}
              </div>
            )}

            {currentLesson.content && (
              <div style={{
                color: '#94a3b8',
                lineHeight: 1.7,
                marginTop: '16px',
                marginBottom: '24px',
                padding: '20px',
                background: '#1e293b',
                borderRadius: '12px',
              }}>
                {currentLesson.content}
              </div>
            )}

            {/* Navigation */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: '12px',
              paddingTop: '16px',
              borderTop: '1px solid #334155',
            }}>
              {prevLesson ? (
                <Link
                  href={`/courses/${course.slug}/learn/${prevLesson.id}`}
                  style={{
                    padding: '12px 24px',
                    background: '#334155',
                    color: 'white',
                    textDecoration: 'none',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                  </svg>
                  บทก่อนหน้า
                </Link>
              ) : (
                <div />
              )}
              {nextLesson && (isEnrolled || nextLesson.isFreePreview) ? (
                <Link
                  href={`/courses/${course.slug}/learn/${nextLesson.id}`}
                  style={{
                    padding: '12px 24px',
                    background: '#2563eb',
                    color: 'white',
                    textDecoration: 'none',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                  }}
                >
                  บทถัดไป
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </Link>
              ) : nextLesson ? (
                <button
                  onClick={() => handleLockedClick(nextLesson.id)}
                  style={{
                    padding: '12px 24px',
                    background: '#475569',
                    color: '#94a3b8',
                    border: 'none',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                  }}
                >
                  🔒 บทถัดไป
                </button>
              ) : null}
            </div>
          </div>
        </div>

        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div
            className="sidebar-overlay open"
            onClick={() => setSidebarOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              zIndex: 99,
            }}
          />
        )}

        {/* Sidebar */}
        <aside 
          className={`learn-sidebar ${sidebarOpen ? 'open' : ''}`}
          style={{
            width: '320px',
            minWidth: '320px',
            background: '#1e293b',
            borderLeft: '1px solid #334155',
            overflowY: 'auto',
            flexShrink: 0,
          }}
        >
          {/* Mobile Close Button */}
          <div className="flex lg:hidden" style={{
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px',
            borderBottom: '1px solid #334155',
          }}>
            <span style={{ color: 'white', fontWeight: 600 }}>เนื้อหาคอร์ส</span>
            <button
              onClick={() => setSidebarOpen(false)}
              style={{
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#334155',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div style={{ padding: '16px' }}>
            <div className="hidden lg:block" style={{
              fontSize: '0.875rem',
              fontWeight: 600,
              color: '#94a3b8',
              marginBottom: '16px',
              padding: '0 16px',
            }}>
              เนื้อหาคอร์ส ({allLessons.length} บท)
            </div>
            <LessonList 
              lessons={allLessons} 
              courseSlug={course.slug}
              currentLessonId={currentLesson.id}
              isEnrolled={isEnrolled}
              onLockedClick={(id) => {
                handleLockedClick(id);
                setSidebarOpen(false);
              }}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}

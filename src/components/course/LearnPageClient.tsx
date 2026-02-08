'use client';

import { useState, useCallback } from 'react';
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
  completedLessonIds: string[];
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
  completedLessonIds: initialCompletedIds,
}: LearnPageClientProps) {
  const [lockedMessage, setLockedMessage] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set(initialCompletedIds));
  const [markingComplete, setMarkingComplete] = useState(false);

  const isCurrentCompleted = completedIds.has(currentLesson.id);
  const completedCount = completedIds.size;
  const totalCount = allLessons.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const handleMarkComplete = useCallback(async () => {
    if (markingComplete) return;
    setMarkingComplete(true);
    const newCompleted = !isCurrentCompleted;
    try {
      const res = await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonId: currentLesson.id,
          completed: newCompleted,
        }),
      });
      if (res.ok) {
        setCompletedIds(prev => {
          const next = new Set(prev);
          if (newCompleted) {
            next.add(currentLesson.id);
          } else {
            next.delete(currentLesson.id);
          }
          return next;
        });
      }
    } catch (error) {
      console.error('Failed to update progress:', error);
    } finally {
      setMarkingComplete(false);
    }
  }, [currentLesson.id, isCurrentCompleted, markingComplete]);

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
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {isEnrolled && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.75rem',
                color: progressPercent === 100 ? '#4ade80' : '#94a3b8',
              }}>
                <div style={{
                  width: '60px',
                  height: '4px',
                  background: '#334155',
                  borderRadius: '2px',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%',
                    width: `${progressPercent}%`,
                    background: progressPercent === 100 ? '#4ade80' : '#3b82f6',
                    borderRadius: '2px',
                    transition: 'width 0.3s ease',
                  }} />
                </div>
                {progressPercent}%
              </div>
            )}
            <div style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
              บทที่ {currentIndex + 1} / {allLessons.length}
            </div>
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

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', marginBottom: '16px' }}>
              {formatDuration(currentLesson.videoDuration) && (
                <div style={{ color: '#64748b', fontSize: '0.875rem' }}>
                  ⏱️ {formatDuration(currentLesson.videoDuration)}
                </div>
              )}

              {isEnrolled && (
                <button
                  onClick={handleMarkComplete}
                  disabled={markingComplete}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 14px',
                    borderRadius: '8px',
                    border: isCurrentCompleted ? '1px solid #22c55e' : '1px solid #475569',
                    background: isCurrentCompleted ? 'rgba(34, 197, 94, 0.1)' : 'transparent',
                    color: isCurrentCompleted ? '#4ade80' : '#94a3b8',
                    cursor: markingComplete ? 'wait' : 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    transition: 'all 0.2s',
                  }}
                >
                  {isCurrentCompleted ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                    </svg>
                  )}
                  {markingComplete ? 'กำลังบันทึก...' : isCurrentCompleted ? 'เรียนจบแล้ว' : 'ทำเครื่องหมายว่าเรียนจบ'}
                </button>
              )}
            </div>

            {currentLesson.content && (
              <div
                className="lesson-content"
                style={{
                  color: '#cbd5e1',
                  lineHeight: 1.8,
                  marginTop: '16px',
                  marginBottom: '24px',
                  padding: '24px',
                  background: '#1e293b',
                  borderRadius: '12px',
                }}
                dangerouslySetInnerHTML={{ __html: currentLesson.content }}
              />
            )}

            {/* Lesson content styles */}
            <style>{`
              .lesson-content p {
                margin: 0.6em 0;
              }
              .lesson-content h2 {
                font-size: 1.35rem;
                font-weight: 600;
                color: #f1f5f9;
                margin: 1.2em 0 0.5em;
              }
              .lesson-content h3 {
                font-size: 1.1rem;
                font-weight: 600;
                color: #e2e8f0;
                margin: 1em 0 0.4em;
              }
              .lesson-content ul, .lesson-content ol {
                padding-left: 1.5em;
                margin: 0.5em 0;
              }
              .lesson-content li {
                margin: 0.3em 0;
              }
              .lesson-content a {
                color: #60a5fa;
                text-decoration: underline;
              }
              .lesson-content a:hover {
                color: #93bbfd;
              }
              .lesson-content code {
                background: #334155;
                padding: 2px 6px;
                border-radius: 4px;
                font-size: 0.9em;
                color: #f472b6;
                font-family: 'Fira Code', 'Consolas', monospace;
              }
              .lesson-content pre {
                background: #0f172a;
                border: 1px solid #334155;
                color: #e2e8f0;
                padding: 16px;
                border-radius: 8px;
                overflow-x: auto;
                margin: 0.75em 0;
                font-family: 'Fira Code', 'Consolas', monospace;
                font-size: 0.9em;
                line-height: 1.6;
              }
              .lesson-content pre code {
                background: none;
                color: inherit;
                padding: 0;
                border-radius: 0;
                font-size: inherit;
              }
              .lesson-content blockquote {
                border-left: 3px solid #3b82f6;
                padding-left: 16px;
                margin: 0.75em 0;
                color: #94a3b8;
                font-style: italic;
              }
              .lesson-content hr {
                border: none;
                border-top: 1px solid #334155;
                margin: 1.2em 0;
              }
              .lesson-content strong {
                color: #f1f5f9;
                font-weight: 600;
              }
              .lesson-content em {
                color: #cbd5e1;
              }
            `}</style>

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
              completedLessonIds={completedIds}
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

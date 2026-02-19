'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  const router = useRouter();
  const [lockedMessage, setLockedMessage] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [lessonSearch, setLessonSearch] = useState('');
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set(initialCompletedIds));
  const [markingComplete, setMarkingComplete] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [autoAdvanceCountdown, setAutoAdvanceCountdown] = useState<number | null>(null);
  const autoAdvanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoAdvanceIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Watch time tracking
  const watchTimeRef = useRef(0);
  const lastSyncRef = useRef(0);
  const isPlayingRef = useRef(false);
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const syncWatchTime = useCallback(async () => {
    const currentWatchTime = Math.floor(watchTimeRef.current);
    if (currentWatchTime <= lastSyncRef.current) return;
    lastSyncRef.current = currentWatchTime;
    try {
      await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonId: currentLesson.id,
          watchTimeSeconds: currentWatchTime,
        }),
      });
    } catch {
      // Silent fail — will retry on next interval
    }
  }, [currentLesson.id]);

  // Auto-sync watch time every 30 seconds while playing
  useEffect(() => {
    syncIntervalRef.current = setInterval(() => {
      if (isPlayingRef.current && watchTimeRef.current > lastSyncRef.current) {
        syncWatchTime();
      }
    }, 30_000);
    return () => {
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
      // Final sync on unmount
      if (watchTimeRef.current > lastSyncRef.current) {
        syncWatchTime();
      }
    };
  }, [syncWatchTime]);

  // Reset watch time tracking when lesson changes
  useEffect(() => {
    watchTimeRef.current = 0;
    lastSyncRef.current = 0;
    isPlayingRef.current = false;
    if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);
    if (autoAdvanceIntervalRef.current) clearInterval(autoAdvanceIntervalRef.current);
    setAutoAdvanceCountdown(null);
  }, [currentLesson.id]);

  // Keyboard navigation: ArrowLeft / ArrowRight
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'ArrowLeft' && prevLesson) {
        router.push(`/courses/${course.slug}/learn/${prevLesson.id}`);
      } else if (e.key === 'ArrowRight' && nextLesson && (isEnrolled || nextLesson.isFreePreview)) {
        router.push(`/courses/${course.slug}/learn/${nextLesson.id}`);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [prevLesson, nextLesson, isEnrolled, router, course.slug]);

  const handleTimeUpdate = useCallback((currentTime: number, _duration?: number) => {
    void _duration;
    watchTimeRef.current = currentTime;
  }, []);

  const handlePlay = useCallback(() => {
    isPlayingRef.current = true;
  }, []);

  const handlePause = useCallback(() => {
    isPlayingRef.current = false;
    syncWatchTime();
  }, [syncWatchTime]);

  const handleEnded = useCallback(() => {
    isPlayingRef.current = false;
    syncWatchTime();
    if (isEnrolled && nextLesson) {
      setAutoAdvanceCountdown(5);
      autoAdvanceIntervalRef.current = setInterval(() => {
        setAutoAdvanceCountdown(prev => {
          if (prev === null || prev <= 1) {
            if (autoAdvanceIntervalRef.current) clearInterval(autoAdvanceIntervalRef.current);
            return null;
          }
          return prev - 1;
        });
      }, 1000);
      autoAdvanceTimerRef.current = setTimeout(() => {
        router.push(`/courses/${course.slug}/learn/${nextLesson.id}`);
      }, 5000);
    }
  }, [syncWatchTime, isEnrolled, nextLesson, router, course.slug]);

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
          watchTimeSeconds: Math.floor(watchTimeRef.current) || undefined,
        }),
      });
      if (res.ok) {
        setCompletedIds(prev => {
          const next = new Set(prev);
          if (newCompleted) {
            next.add(currentLesson.id);
            if (next.size === totalCount) {
              setShowCelebration(true);
              setTimeout(() => setShowCelebration(false), 4000);
            }
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
      {/* Completion Celebration Toast */}
      {showCelebration && (
        <div style={{
          position: 'fixed',
          top: '72px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 200,
          background: 'linear-gradient(135deg, #16a34a, #15803d)',
          color: 'white',
          padding: '14px 28px',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(22,163,74,0.45)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '0.9375rem',
          fontWeight: 600,
          pointerEvents: 'none',
        }}>
          🎉 ยินดีด้วย! คุณเรียนจบคอร์สนี้แล้ว!
        </div>
      )}

      {/* Header */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
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
                gap: '8px',
                fontSize: '0.75rem',
                color: progressPercent === 100 ? '#4ade80' : '#94a3b8',
              }}>
                <div style={{
                  width: '80px',
                  height: '6px',
                  background: '#334155',
                  borderRadius: '3px',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%',
                    width: `${progressPercent}%`,
                    background: progressPercent === 100 ? '#4ade80' : '#3b82f6',
                    borderRadius: '3px',
                    transition: 'width 0.4s ease',
                  }} />
                </div>
                <span style={{ fontWeight: 600, minWidth: '30px' }}>{progressPercent}%</span>
              </div>
            )}
            <div style={{
              color: '#94a3b8',
              fontSize: '0.8125rem',
              background: '#334155',
              padding: '3px 10px',
              borderRadius: '6px',
              fontWeight: 500,
            }}>
              {currentIndex + 1} / {allLessons.length}
            </div>
          </div>
          {/* Desktop sidebar toggle */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden lg:flex"
            title={sidebarCollapsed ? 'แสดงรายการบทเรียน' : 'ซ่อนรายการบทเรียน'}
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
              {sidebarCollapsed ? (
                <path d="M4 6h16M4 12h16M4 18h16" />
              ) : (
                <path d="M9 3h6v18H9zM3 6h6M3 12h6M3 18h6" />
              )}
            </svg>
            {sidebarCollapsed ? 'เนื้อหา' : ''}
          </button>
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
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
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
              <BunnyPlayer
                videoId={currentLesson.videoUrl}
                onTimeUpdate={handleTimeUpdate}
                onPlay={handlePlay}
                onPause={handlePause}
                onEnded={handleEnded}
              />
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

          {/* Auto-advance banner */}
          {autoAdvanceCountdown !== null && nextLesson && (
            <div style={{
              background: '#1e293b',
              borderBottom: '1px solid #334155',
              padding: '10px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', fontSize: '0.875rem', minWidth: 0 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" style={{ flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                </svg>
                <span>บทถัดไป:</span>
                <span style={{ color: 'white', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nextLesson.title}</span>
                <span style={{ color: '#3b82f6', fontWeight: 700, flexShrink: 0 }}>({autoAdvanceCountdown}s)</span>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                <button
                  onClick={() => {
                    if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);
                    if (autoAdvanceIntervalRef.current) clearInterval(autoAdvanceIntervalRef.current);
                    setAutoAdvanceCountdown(null);
                  }}
                  style={{ padding: '5px 12px', background: 'transparent', border: '1px solid #475569', color: '#94a3b8', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8125rem' }}
                >
                  ยกเลิก
                </button>
                <Link
                  href={`/courses/${course.slug}/learn/${nextLesson.id}`}
                  style={{ padding: '5px 12px', background: '#2563eb', color: 'white', borderRadius: '6px', textDecoration: 'none', fontSize: '0.8125rem', fontWeight: 500 }}
                >
                  ไปเลย
                </Link>
              </div>
            </div>
          )}

          {/* Lesson Info */}
          <div style={{ padding: '20px 24px', flex: 1, overflowY: 'auto', background: '#0f172a' }}>
            {/* Title row + Mark Complete */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '10px' }}>
              <h1 style={{ fontSize: '1.375rem', fontWeight: 600, color: 'white', lineHeight: 1.4, flex: 1, margin: 0 }}>
                {currentLesson.title}
              </h1>
              {isEnrolled && (
                <button
                  onClick={handleMarkComplete}
                  disabled={markingComplete}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: isCurrentCompleted ? '1px solid #22c55e' : '1px solid #475569',
                    background: isCurrentCompleted ? 'rgba(34,197,94,0.12)' : '#1e293b',
                    color: isCurrentCompleted ? '#4ade80' : '#94a3b8',
                    cursor: markingComplete ? 'wait' : 'pointer',
                    fontSize: '0.8125rem',
                    fontWeight: 500,
                    transition: 'all 0.2s',
                    flexShrink: 0,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {isCurrentCompleted ? (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                    </svg>
                  )}
                  {markingComplete ? 'กำลังบันทึก...' : isCurrentCompleted ? 'เรียนจบแล้ว' : 'ทำเครื่องหมายว่าเรียนจบ'}
                </button>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
              {formatDuration(currentLesson.videoDuration) && (
                <div style={{ color: '#64748b', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                  </svg>
                  {formatDuration(currentLesson.videoDuration)}
                </div>
              )}
              <div style={{ color: '#475569', fontSize: '0.8125rem' }}>บทที่ {currentIndex + 1} จาก {allLessons.length}</div>
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
              .lesson-content ul {
                padding-left: 1.5em;
                margin: 0.5em 0;
                list-style-type: disc;
              }
              .lesson-content ol {
                padding-left: 1.5em;
                margin: 0.5em 0;
                list-style-type: decimal;
              }
              .lesson-content li {
                margin: 0.3em 0;
                display: list-item;
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', paddingTop: '16px', borderTop: '1px solid #1e293b' }}>
              {prevLesson ? (
                <Link
                  href={`/courses/${course.slug}/learn/${prevLesson.id}`}
                  style={{
                    padding: '10px 18px',
                    background: '#1e293b',
                    color: '#cbd5e1',
                    textDecoration: 'none',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    border: '1px solid #334155',
                    transition: 'background 0.2s',
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.background = '#334155')}
                  onMouseOut={(e) => (e.currentTarget.style.background = '#1e293b')}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                  </svg>
                  บทก่อนหน้า
                </Link>
              ) : (
                <div />
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#334155', fontSize: '0.75rem' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
                <span className="hidden sm:inline" style={{ color: '#475569' }}>← → เปลี่ยนบท</span>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
              </div>
              {nextLesson && (isEnrolled || nextLesson.isFreePreview) ? (
                <Link
                  href={`/courses/${course.slug}/learn/${nextLesson.id}`}
                  style={{
                    padding: '10px 18px',
                    background: '#2563eb',
                    color: 'white',
                    textDecoration: 'none',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    transition: 'background 0.2s',
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.background = '#1d4ed8')}
                  onMouseOut={(e) => (e.currentTarget.style.background = '#2563eb')}
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
                    padding: '10px 18px',
                    background: '#1e293b',
                    color: '#64748b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C9.24 2 7 4.24 7 7v3H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V12c0-1.1-.9-2-2-2h-1V7c0-2.76-2.24-5-5-5zm0 2c1.66 0 3 1.34 3 3v3H9V7c0-1.66 1.34-3 3-3z"/>
                  </svg>
                  บทถัดไป
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
            width: sidebarCollapsed ? '0px' : '320px',
            minWidth: sidebarCollapsed ? '0px' : '320px',
            background: '#1e293b',
            borderLeft: sidebarCollapsed ? 'none' : '1px solid #334155',
            overflow: 'hidden',
            flexShrink: 0,
            transition: 'width 0.3s ease, min-width 0.3s ease',
            display: 'flex',
            flexDirection: 'column',
            position: 'sticky',
            top: '57px',
            height: 'calc(100vh - 57px)',
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

          {/* Sticky Header: Title + Progress + Search */}
          <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid #334155',
            flexShrink: 0,
            background: '#1e293b',
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px',
            }}>
              <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#94a3b8' }}>
                เนื้อหาคอร์ส ({allLessons.length} บท)
              </span>
              {isEnrolled && (
                <span style={{ fontSize: '0.6875rem', color: progressPercent === 100 ? '#4ade80' : '#64748b' }}>
                  {completedCount}/{totalCount} ({progressPercent}%)
                </span>
              )}
            </div>

            {/* Progress Bar */}
            {isEnrolled && (
              <div style={{
                height: '3px',
                background: '#334155',
                borderRadius: '2px',
                overflow: 'hidden',
                marginBottom: '10px',
              }}>
                <div style={{
                  height: '100%',
                  width: `${progressPercent}%`,
                  background: progressPercent === 100 ? '#4ade80' : '#3b82f6',
                  borderRadius: '2px',
                  transition: 'width 0.3s ease',
                }} />
              </div>
            )}

            {/* Search */}
            <input
              type="text"
              value={lessonSearch}
              onChange={(e) => setLessonSearch(e.target.value)}
              placeholder="🔍 ค้นหาบทเรียน..."
              style={{
                width: '100%',
                padding: '7px 10px',
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '6px',
                color: 'white',
                fontSize: '0.8125rem',
                outline: 'none',
              }}
            />
          </div>

          {/* Scrollable Lesson List */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px' }}>
            <LessonList 
              lessons={allLessons} 
              courseSlug={course.slug}
              currentLessonId={currentLesson.id}
              isEnrolled={isEnrolled}
              completedLessonIds={completedIds}
              searchQuery={lessonSearch}
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

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import LessonList from './LessonList';
import LearningNavbar from './LearningNavbar';
import BunnyPlayer from '@/components/video/BunnyPlayer';
import { sanitizeRichContent } from '@/lib/sanitize';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

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
  const sidebarCloseRef = useRef<HTMLButtonElement | null>(null);
  const sidebarReturnFocusRef = useRef<HTMLElement | null>(null);

  // Watch time tracking
  const watchTimeRef = useRef(0);
  const lastSyncRef = useRef(0);
  const isPlayingRef = useRef(false);
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!sidebarOpen) return;

    sidebarReturnFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const previousOverflow = document.body.style.overflow;
    const focusFrame = window.requestAnimationFrame(() => sidebarCloseRef.current?.focus());
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSidebarOpen(false);
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleEscape);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      window.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = previousOverflow;
      sidebarReturnFocusRef.current?.focus();
    };
  }, [sidebarOpen]);

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

  const handleTimeUpdate = useCallback((currentTime: number, _duration: number) => {
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
    // Auto mark current lesson as complete when video ends
    if (isEnrolled && !completedIds.has(currentLesson.id)) {
      fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonId: currentLesson.id,
          completed: true,
          watchTimeSeconds: Math.floor(watchTimeRef.current) || undefined,
        }),
      }).then(res => {
        if (res.ok) {
          setCompletedIds(prev => {
            const next = new Set(prev);
            next.add(currentLesson.id);
            if (next.size === allLessons.length) {
              setShowCelebration(true);
              setTimeout(() => setShowCelebration(false), 4000);
            }
            return next;
          });
        }
      }).catch(() => {});
    }
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
  }, [syncWatchTime, isEnrolled, nextLesson, router, course.slug, currentLesson.id, completedIds, allLessons.length]);

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
  }, [currentLesson.id, isCurrentCompleted, markingComplete, totalCount]);

  const handleLockedClick = (lessonId: string) => {
    const lesson = allLessons.find(l => l.id === lessonId);
    setLockedMessage(`บทเรียน "${lesson?.title}" ต้องลงทะเบียนเรียนก่อนจึงจะสามารถดูได้`);
  };

  return (
    <div className="min-h-screen bg-muted/20 text-foreground" data-theme="light" data-surface="learning">
      {/* Completion Celebration Toast */}
      {showCelebration && (
        <div className="fixed left-1/2 top-20 z-[70] -translate-x-1/2 rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-lg" role="status">
          🎉 ยินดีด้วย! คุณเรียนจบคอร์สนี้แล้ว!
        </div>
      )}

      <LearningNavbar
        courseSlug={course.slug}
        courseTitle={course.title}
        lessonTitle={currentLesson.title}
        currentIndex={currentIndex}
        totalCount={totalCount}
        progressPercent={progressPercent}
        isEnrolled={isEnrolled}
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={() => setSidebarCollapsed(current => !current)}
        onOpenSidebar={() => {
          setSidebarCollapsed(false);
          setSidebarOpen(true);
        }}
      />


      <div className={cn('mx-auto grid max-w-[1600px]', sidebarCollapsed ? 'lg:grid-cols-1' : 'lg:grid-cols-[minmax(0,1fr)_20rem]')}>
        {/* Video Area */}
        <main className="min-w-0 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <header className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">บทเรียนปัจจุบัน</p>
            <div className="mt-2 flex items-start justify-between gap-4">
              <h1 className="max-w-4xl text-2xl font-bold tracking-tight sm:text-3xl">{currentLesson.title}</h1>
              <Badge variant="outline">{String(currentIndex + 1).padStart(2, '0')} / {String(allLessons.length).padStart(2, '0')}</Badge>
            </div>
            <small className="mt-2 block text-sm text-muted-foreground">{isEnrolled ? course.title : `บททดลองจาก ${course.title}`}</small>
          </header>

          {/* Video Player or Locked Message */}
          <div className="relative aspect-video overflow-hidden rounded-xl bg-black shadow-lg [&_iframe]:h-full [&_iframe]:w-full">
            {lockedMessage ? (
              <div className="flex h-full flex-col items-center justify-center p-6 text-center text-slate-100">
                <div className="mb-4 flex size-16 items-center justify-center rounded-full border border-amber-400/30 bg-amber-400/10">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="#f59e0b">
                    <path d="M12 2C9.24 2 7 4.24 7 7v3H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V12c0-1.1-.9-2-2-2h-1V7c0-2.76-2.24-5-5-5zm0 2c1.66 0 3 1.34 3 3v3H9V7c0-1.66 1.34-3 3-3zm0 10c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2z"/>
                  </svg>
                </div>
                <h2 className="text-2xl font-semibold">
                  🔒 บทเรียนนี้ต้องลงทะเบียน
                </h2>
                <p className="mt-3 max-w-lg text-sm leading-6 text-slate-400">
                  {lockedMessage}
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setLockedMessage(null)}
                  >
                    กลับไปดูบทเรียนปัจจุบัน
                  </Button>
                  <Button asChild><Link href={`/courses/${course.slug}`}>ลงทะเบียนเรียน</Link></Button>
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
              <div className="flex h-full items-center justify-center text-sm text-slate-400">
                ไม่มีวิดีโอสำหรับบทเรียนนี้
              </div>
            )}
          </div>

          {/* Auto-advance banner */}
          {autoAdvanceCountdown !== null && nextLesson && (
            <Card className="mt-4 border-primary/30 bg-primary/5"><CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-2 text-sm">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                </svg>
                <span>บทถัดไป:</span>
                <strong>{nextLesson.title}</strong>
                <span className="shrink-0 text-primary">({autoAdvanceCountdown}s)</span>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);
                    if (autoAdvanceIntervalRef.current) clearInterval(autoAdvanceIntervalRef.current);
                    setAutoAdvanceCountdown(null);
                  }}
                >
                  ยกเลิก
                </Button>
                <Button asChild size="sm"><Link href={`/courses/${course.slug}/learn/${nextLesson.id}`}>ไปเลย</Link></Button>
              </div>
            </CardContent></Card>
          )}

          <Card className="mt-6" aria-label="สถานะและการเรียนต่อ"><CardContent className="grid gap-6 p-6 md:grid-cols-[minmax(0,1fr)_minmax(16rem,.8fr)]">
            <div className="grid content-start gap-3">
              <div>
                <span className="text-xs text-muted-foreground">{isEnrolled ? 'ความคืบหน้าคอร์ส' : 'สถานะการเข้าถึง'}</span>
                <strong className="mt-1 block text-lg">{isEnrolled ? `เรียนจบแล้ว ${progressPercent}%` : 'บทเรียนทดลองฟรี'}</strong>
              </div>
              {isEnrolled ? (
                <>
                  <Progress value={progressPercent} aria-hidden="true" />
                  <p className="text-sm text-muted-foreground">ระบบบันทึกความคืบหน้าเพื่อให้กลับมาเรียนต่อได้</p>
                </>
              ) : (
                <p className="text-sm leading-6 text-muted-foreground">ดูบทนี้ได้โดยไม่ต้องลงทะเบียน ส่วนบทที่ล็อกยังคงต้องสมัครเรียนก่อน</p>
              )}
            </div>

            <div className="grid content-start gap-3">
              {isEnrolled && (
                <Button
                  type="button"
                  variant={isCurrentCompleted ? 'outline' : 'default'}
                  onClick={handleMarkComplete}
                  disabled={markingComplete}
                >
                  {markingComplete ? 'กำลังบันทึก...' : isCurrentCompleted ? '✓ เรียนจบแล้ว' : 'ทำเครื่องหมายว่าเรียนจบ'}
                </Button>
              )}
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">ขั้นตอนถัดไป</span>
              {nextLesson && (isEnrolled || nextLesson.isFreePreview) ? (
                <Link className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 rounded-lg border p-4 transition hover:border-primary/40 hover:bg-muted/40" href={`/courses/${course.slug}/learn/${nextLesson.id}`}>
                  <span className="text-xs text-muted-foreground">เรียนบทถัดไป</span>
                  <strong className="col-start-1 mt-1 truncate">{nextLesson.title}</strong>
                  <span aria-hidden="true">→</span>
                </Link>
              ) : nextLesson ? (
                <button type="button" className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 rounded-lg border p-4 text-left text-muted-foreground" onClick={() => handleLockedClick(nextLesson.id)}>
                  <span className="text-xs">บทถัดไป</span>
                  <strong className="col-start-1 mt-1 truncate">{nextLesson.title}</strong>
                  <span aria-hidden="true">ล็อก</span>
                </button>
              ) : (
                <Link className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 rounded-lg border p-4 transition hover:border-primary/40 hover:bg-muted/40" href="/dashboard">
                  <span className="text-xs text-muted-foreground">เรียนครบทุกบทแล้ว</span>
                  <strong className="col-start-1 mt-1">กลับไปแดชบอร์ด</strong>
                  <span aria-hidden="true">→</span>
                </Link>
              )}
            </div>
          </CardContent></Card>

          {/* Lesson Info */}
          <Card className="mt-6"><CardContent className="p-6 sm:p-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">เนื้อหาประกอบ</p>
              <h2 className="mt-2 text-2xl font-bold">เนื้อหาบทเรียน</h2>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
              {formatDuration(currentLesson.videoDuration) && (
                <div className="flex items-center gap-1 rounded-full bg-muted px-3 py-1">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                  </svg>
                  {formatDuration(currentLesson.videoDuration)}
                </div>
              )}
              <div className="rounded-full bg-muted px-3 py-1">บทที่ {currentIndex + 1} จาก {allLessons.length}</div>
            </div>

            {currentLesson.content ? (
              <div
                className="lesson-content mt-8"
                dangerouslySetInnerHTML={{ __html: sanitizeRichContent(currentLesson.content ?? '') }}
              />
            ) : (
              <p className="mt-8 rounded-lg border border-dashed p-6 text-muted-foreground">บทเรียนนี้ไม่มีเนื้อหาเพิ่มเติม</p>
            )}

            {/* Navigation */}
            <div className="mt-10 grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-t pt-6">
              {prevLesson ? (
                <Link
                  href={`/courses/${course.slug}/learn/${prevLesson.id}`}
                  className="inline-flex h-10 w-fit items-center gap-2 rounded-lg border bg-background px-4 text-sm font-semibold hover:bg-muted"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                  </svg>
                  บทก่อนหน้า
                </Link>
              ) : (
                <div />
              )}
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
                <span className="hidden sm:inline">← → เปลี่ยนบท</span>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
              </div>
              {nextLesson && (isEnrolled || nextLesson.isFreePreview) ? (
                <Link
                  href={`/courses/${course.slug}/learn/${nextLesson.id}`}
                  className="ml-auto inline-flex h-10 w-fit items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  บทถัดไป
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </Link>
              ) : nextLesson ? (
                <button
                  onClick={() => handleLockedClick(nextLesson.id)}
                  className="ml-auto inline-flex h-10 w-fit items-center gap-2 rounded-lg bg-muted px-4 text-sm font-semibold text-muted-foreground"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C9.24 2 7 4.24 7 7v3H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V12c0-1.1-.9-2-2-2h-1V7c0-2.76-2.24-5-5-5zm0 2c1.66 0 3 1.34 3 3v3H9V7c0-1.66 1.34-3 3-3z"/>
                  </svg>
                  บทถัดไป
                </button>
              ) : null}
            </div>
          </CardContent></Card>
        </main>

        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/60 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside 
          className={cn('fixed inset-y-0 right-0 z-50 flex w-[min(22rem,90vw)] translate-x-full flex-col border-l border-white/10 bg-slate-950 text-slate-100 transition-transform lg:static lg:z-auto lg:w-auto lg:translate-x-0', sidebarOpen && 'translate-x-0', sidebarCollapsed && 'lg:hidden')}
          aria-label="ลำดับบทเรียน"
        >
          {/* Mobile Close Button */}
          <div className="flex min-h-14 items-center justify-between border-b border-white/10 px-4 lg:hidden">
            <span>เนื้อหาคอร์ส</span>
            <Button
              ref={sidebarCloseRef}
              type="button"
              onClick={() => setSidebarOpen(false)}
              aria-label="ปิดรายการบทเรียน"
              size="icon-sm"
              variant="ghost"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Button>
          </div>

          {/* Sticky Header: Title + Progress + Search */}
          <div className="border-b border-white/10 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">บทเรียนทั้งหมด</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <h2 className="mr-auto font-semibold">ลำดับการเรียน</h2>
              <span className="text-xs text-slate-400">{allLessons.length} บท</span>
              {isEnrolled && (
                <span className={cn('text-xs text-slate-400', progressPercent === 100 && 'text-emerald-400')}>
                  {completedCount}/{totalCount} ({progressPercent}%)
                </span>
              )}
            </div>

            {/* Progress Bar */}
            {isEnrolled && (
              <Progress className="mt-4 bg-white/10" value={progressPercent} />
            )}

            {/* Search */}
            <Input className="mt-4 border-white/10 bg-white/5 text-slate-100 placeholder:text-slate-500"
              type="text"
              aria-label="ค้นหาบทเรียน"
              value={lessonSearch}
              onChange={(e) => setLessonSearch(e.target.value)}
              placeholder="ค้นหาบทเรียน..."
            />
          </div>

          {/* Scrollable Lesson List */}
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
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

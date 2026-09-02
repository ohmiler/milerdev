'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Check, CircleCheck, FileText, Lock } from 'lucide-react';
import BunnyPlayer from '@/components/video/BunnyPlayer';
import LearningCurriculum from './LearningCurriculum';
import LearningNavbar from './LearningNavbar';
import { sanitizeRichContent } from '@/lib/sanitize';
import { showToast } from '@/components/ui/Toast';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import LearningWorkspaceAnalytics from '@/components/analytics/LearningWorkspaceAnalytics';
import type { LearningCurriculumLesson } from '@/lib/learning-workspace';

interface CurrentLesson extends LearningCurriculumLesson {
  videoUrl: string | null;
  content: string | null;
}

interface Course {
  id: string;
  title: string;
  slug: string;
}

interface LearnPageClientProps {
  course: Course;
  currentLesson: CurrentLesson;
  allLessons: LearningCurriculumLesson[];
  prevLesson: LearningCurriculumLesson | null;
  nextLesson: LearningCurriculumLesson | null;
  currentIndex: number;
  isEnrolled: boolean;
  canTrackProgress: boolean;
  completedLessonIds: string[];
  currentProgress: { completed: boolean; watchTimeSeconds: number };
}

const formatDuration = (seconds: number | null) => {
  if (!seconds || seconds <= 0) return null;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes} นาที ${remainingSeconds < 10 ? '0' : ''}${remainingSeconds} วินาที`;
};

export default function LearnPageClient({
  course,
  currentLesson,
  allLessons,
  prevLesson,
  nextLesson,
  currentIndex,
  isEnrolled,
  canTrackProgress,
  completedLessonIds: initialCompletedIds,
  currentProgress,
}: LearnPageClientProps) {
  const [mobileCurriculumOpen, setMobileCurriculumOpen] = useState(false);
  const [curriculumCollapsed, setCurriculumCollapsed] = useState(false);
  const [lessonSearch, setLessonSearch] = useState('');
  const [lockedLesson, setLockedLesson] = useState<LearningCurriculumLesson | null>(null);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set(initialCompletedIds));
  const [markingComplete, setMarkingComplete] = useState(false);
  const completionPendingRef = useRef(false);
  const watchTimeRef = useRef(currentProgress.watchTimeSeconds);
  const lastSyncRef = useRef(currentProgress.watchTimeSeconds);
  const isPlayingRef = useRef(false);
  const mobileCurriculumTriggerRef = useRef<HTMLElement | null>(null);
  const lockedLessonTriggerRef = useRef<HTMLElement | null>(null);

  const completedCount = completedIds.size;
  const totalCount = allLessons.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const isCurrentCompleted = completedIds.has(currentLesson.id);
  const isReviewMode = isEnrolled && totalCount > 0 && completedCount === totalCount;
  const hasContent = Boolean(currentLesson.content?.trim());
  const duration = formatDuration(currentLesson.videoDuration);

  const syncWatchTime = useCallback(async () => {
    if (!canTrackProgress) return;
    const currentWatchTime = Math.floor(watchTimeRef.current);
    if (currentWatchTime <= lastSyncRef.current) return;
    lastSyncRef.current = currentWatchTime;

    try {
      const response = await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonId: currentLesson.id,
          watchTimeSeconds: currentWatchTime,
        }),
      });
      if (!response.ok) lastSyncRef.current = 0;
    } catch {
      lastSyncRef.current = 0;
    }
  }, [canTrackProgress, currentLesson.id]);

  useEffect(() => {
    if (!canTrackProgress) return;
    const syncInterval = window.setInterval(() => {
      if (isPlayingRef.current && watchTimeRef.current > lastSyncRef.current) {
        void syncWatchTime();
      }
    }, 30_000);

    return () => {
      window.clearInterval(syncInterval);
      if (watchTimeRef.current > lastSyncRef.current) void syncWatchTime();
    };
  }, [canTrackProgress, syncWatchTime]);

  useEffect(() => {
    watchTimeRef.current = currentProgress.watchTimeSeconds;
    lastSyncRef.current = currentProgress.watchTimeSeconds;
    isPlayingRef.current = false;
    completionPendingRef.current = false;
    setMarkingComplete(false);
    setLockedLesson(null);
  }, [currentLesson.id, currentProgress.watchTimeSeconds]);

  const completeCurrentLesson = useCallback(async () => {
    if (!isEnrolled || !canTrackProgress || completedIds.has(currentLesson.id) || completionPendingRef.current) return;

    completionPendingRef.current = true;
    setMarkingComplete(true);
    try {
      const response = await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonId: currentLesson.id,
          completed: true,
          watchTimeSeconds: Math.floor(watchTimeRef.current) || undefined,
        }),
      });

      if (!response.ok) throw new Error('Unable to save lesson progress');

      const nextCompletedCount = completedIds.size + 1;
      setCompletedIds((current) => new Set(current).add(currentLesson.id));
      showToast(
        nextCompletedCount === totalCount ? 'เรียนครบทุกบทแล้ว พร้อมกลับมาทบทวนได้ทุกเมื่อ' : 'บันทึกว่าเรียนจบบทนี้แล้ว',
        'success',
      );
    } catch {
      showToast('บันทึกความคืบหน้าไม่สำเร็จ กรุณาลองอีกครั้ง', 'error');
    } finally {
      completionPendingRef.current = false;
      setMarkingComplete(false);
    }
  }, [canTrackProgress, completedIds, currentLesson.id, isEnrolled, totalCount]);

  const handleTimeUpdate = useCallback((currentTime: number) => {
    watchTimeRef.current = currentTime;
  }, []);

  const handlePlay = useCallback(() => {
    isPlayingRef.current = true;
  }, []);

  const handlePause = useCallback(() => {
    isPlayingRef.current = false;
    void syncWatchTime();
  }, [syncWatchTime]);

  const handleEnded = useCallback(() => {
    isPlayingRef.current = false;
    void syncWatchTime().then(completeCurrentLesson);
  }, [completeCurrentLesson, syncWatchTime]);

  const openLockedDialog = useCallback((lessonId: string) => {
    const lesson = allLessons.find((item) => item.id === lessonId);
    if (!lesson) return;
    lockedLessonTriggerRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    setMobileCurriculumOpen(false);
    setLockedLesson(lesson);
  }, [allLessons]);

  const openMobileCurriculum = useCallback((returnFocus: HTMLElement | null) => {
    mobileCurriculumTriggerRef.current = returnFocus;
    setMobileCurriculumOpen(true);
  }, []);

  const curriculum = (
    <LearningCurriculum
      courseSlug={course.slug}
      courseTitle={course.title}
      lessons={allLessons}
      currentLessonId={currentLesson.id}
      isEnrolled={isEnrolled}
      completedLessonIds={completedIds}
      completedCount={completedCount}
      progressPercent={progressPercent}
      searchQuery={lessonSearch}
      onSearchChange={setLessonSearch}
      onLockedClick={openLockedDialog}
    />
  );

  return (
    <>
      <LearningWorkspaceAnalytics lessonId={currentLesson.id} enabled={isEnrolled} />
    <div className="min-h-screen bg-[var(--academy-canvas)] text-foreground" data-theme="light" data-surface="learning">
      <LearningNavbar
        courseSlug={course.slug}
        courseTitle={course.title}
        lessonTitle={currentLesson.title}
        currentIndex={currentIndex}
        totalCount={totalCount}
        progressPercent={progressPercent}
        isEnrolled={isEnrolled}
        sidebarCollapsed={curriculumCollapsed}
        onToggleSidebar={() => setCurriculumCollapsed((current) => !current)}
        onOpenSidebar={openMobileCurriculum}
      />

      <div className={cn('grid min-h-[calc(100dvh-4rem)]', !curriculumCollapsed && 'lg:grid-cols-[22.5rem_minmax(0,1fr)]')}>
        <main className="min-w-0 px-4 py-6 sm:px-6 lg:order-2 lg:px-8 lg:py-10">
          <div className={cn('w-full max-w-6xl', curriculumCollapsed ? 'mx-auto' : 'mx-auto min-[1800px]:-translate-x-20 min-[2400px]:-translate-x-40')}>
            <header className="mb-6">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">บทที่ {currentIndex + 1} จาก {totalCount}</Badge>
                {!isEnrolled && <Badge variant="outline">บทเรียนทดลองฟรี</Badge>}
                {duration && <span className="text-sm text-muted-foreground">{duration}</span>}
              </div>
              <h1 className="mt-3 max-w-4xl font-heading text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">{currentLesson.title}</h1>
              <p className="mt-2 text-sm text-muted-foreground">{course.title}</p>
            </header>

            {currentLesson.videoUrl && (
              <div className="relative aspect-video overflow-hidden rounded-2xl bg-slate-950 shadow-[0_22px_60px_-32px_rgba(15,23,42,0.65)] ring-1 ring-slate-950/10 [&_iframe]:h-full [&_iframe]:w-full">
                <BunnyPlayer
                  videoId={currentLesson.videoUrl}
                  onTimeUpdate={handleTimeUpdate}
                  onPlay={handlePlay}
                  onPause={handlePause}
                  onEnded={handleEnded}
                />
              </div>
            )}

            <section className="mt-6 flex flex-col gap-4 rounded-2xl border bg-background p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-5" aria-label="สถานะบทเรียน">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary" aria-hidden="true">
                  {isCurrentCompleted ? <CircleCheck className="size-5" /> : <FileText className="size-5" />}
                </span>
                <div>
                  <h2 className="font-heading text-base font-semibold">
                    {isReviewMode ? 'เรียนครบแล้ว · กำลังทบทวน' : isCurrentCompleted ? 'เรียนจบบทนี้แล้ว' : isEnrolled ? 'เรียนตามจังหวะของคุณ' : 'บทเรียนทดลองฟรี'}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {isCurrentCompleted
                      ? 'คุณกลับมาทบทวนบทนี้ได้เสมอ'
                      : isEnrolled
                        ? currentLesson.videoUrl ? 'ดูวิดีโอจนจบ หรือกดบันทึกเมื่อเรียนเนื้อหาครบแล้ว' : 'กดบันทึกเมื่ออ่านและฝึกตามเนื้อหาเรียบร้อยแล้ว'
                        : 'ความคืบหน้าจะถูกบันทึกหลังจากสมัครและเข้าสู่ระบบ'}
                  </p>
                </div>
              </div>
              {isEnrolled && !isCurrentCompleted && (
                <Button type="button" onClick={() => void completeCurrentLesson()} disabled={markingComplete}>
                  <Check data-icon="inline-start" aria-hidden="true" />
                  {markingComplete ? 'กำลังบันทึก...' : 'ทำเครื่องหมายว่าเรียนจบ'}
                </Button>
              )}
            </section>

            {hasContent && (
              <Card className="mt-6" aria-labelledby="lesson-content-title">
                <CardHeader>
                  <CardTitle id="lesson-content-title">เนื้อหาบทเรียน</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="lesson-content" dangerouslySetInnerHTML={{ __html: sanitizeRichContent(currentLesson.content ?? '') }} />
                </CardContent>
              </Card>
            )}

            {!currentLesson.videoUrl && !hasContent && (
              <Empty className="mt-6 border" aria-label="ไม่มีเนื้อหาบทเรียน">
                <EmptyHeader>
                  <EmptyMedia variant="icon"><FileText aria-hidden="true" /></EmptyMedia>
                  <EmptyTitle>บทเรียนนี้ยังไม่มีเนื้อหา</EmptyTitle>
                  <EmptyDescription>คุณยังสามารถเลือกบทก่อนหน้าหรือบทถัดไปได้</EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}

            <nav className="mt-8 grid grid-cols-2 gap-3 border-t pt-6" aria-label="เปลี่ยนบทเรียน">
              {prevLesson ? (
                <Button asChild variant="outline" className="h-auto min-h-12 justify-start px-4 py-3">
                  <Link href={`/courses/${course.slug}/learn/${prevLesson.id}`}>
                    <ArrowLeft data-icon="inline-start" aria-hidden="true" />
                    <span className="min-w-0 text-left"><small className="block text-xs font-normal text-muted-foreground">บทก่อนหน้า</small><strong className="block truncate text-sm">{prevLesson.title}</strong></span>
                  </Link>
                </Button>
              ) : <span />}

              {nextLesson && (isEnrolled || nextLesson.isFreePreview) ? (
                <Button asChild className="h-auto min-h-12 justify-end px-4 py-3">
                  <Link href={`/courses/${course.slug}/learn/${nextLesson.id}`}>
                    <span className="min-w-0 text-right"><small className="block text-xs font-normal text-primary-foreground/75">บทถัดไป</small><strong className="block truncate text-sm">{nextLesson.title}</strong></span>
                    <ArrowRight data-icon="inline-end" aria-hidden="true" />
                  </Link>
                </Button>
              ) : nextLesson ? (
                <Button type="button" variant="secondary" className="h-auto min-h-12 justify-end px-4 py-3" onClick={() => openLockedDialog(nextLesson.id)}>
                  <span className="min-w-0 text-right"><small className="block text-xs font-normal text-muted-foreground">บทถัดไป</small><strong className="block truncate text-sm">{nextLesson.title}</strong></span>
                  <Lock data-icon="inline-end" aria-hidden="true" />
                </Button>
              ) : <span />}
            </nav>
          </div>
        </main>

        {!curriculumCollapsed && (
          <aside className="sticky top-16 hidden h-[calc(100dvh-4rem)] min-h-0 border-r bg-background lg:order-1 lg:block" aria-label="ลำดับบทเรียน">
            {curriculum}
          </aside>
        )}
      </div>

      <Sheet open={mobileCurriculumOpen} onOpenChange={setMobileCurriculumOpen}>
        <SheetContent
          side="left"
          className="!w-[min(92vw,25rem)] p-0 sm:!max-w-[25rem]"
          onCloseAutoFocus={(event) => {
            if (!mobileCurriculumTriggerRef.current) return;
            event.preventDefault();
            mobileCurriculumTriggerRef.current.focus();
            mobileCurriculumTriggerRef.current = null;
          }}
        >
          <SheetHeader className="sr-only">
            <SheetTitle>ลำดับบทเรียน</SheetTitle>
            <SheetDescription>ค้นหาและเลือกบทเรียนในคอร์สนี้</SheetDescription>
          </SheetHeader>
          {curriculum}
        </SheetContent>
      </Sheet>

      <AlertDialog open={Boolean(lockedLesson)} onOpenChange={(open) => { if (!open) setLockedLesson(null); }}>
        <AlertDialogContent
          onCloseAutoFocus={(event) => {
            if (!lockedLessonTriggerRef.current) return;
            event.preventDefault();
            lockedLessonTriggerRef.current.focus();
            lockedLessonTriggerRef.current = null;
          }}
        >
          <AlertDialogHeader>
            <AlertDialogMedia><Lock className="size-7 text-primary" /></AlertDialogMedia>
            <AlertDialogTitle>สมัครเรียนเพื่อเปิดบทนี้</AlertDialogTitle>
            <AlertDialogDescription>
              บทเรียน “{lockedLesson?.title}” เป็นเนื้อหาสำหรับผู้เรียนในคอร์ส ดูรายละเอียดและสมัครได้จากหน้าคอร์ส
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ไว้ก่อน</AlertDialogCancel>
            <Button asChild><Link href={`/courses/${course.slug}`}>ดูหน้าคอร์ส</Link></Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </>
  );
}

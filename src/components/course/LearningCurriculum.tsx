'use client';

import { BookOpen, Check, Lock, Search } from 'lucide-react';
import LessonList from './LessonList';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';

interface Lesson {
  id: string;
  title: string;
  videoDuration: number | null;
  isFreePreview: boolean | null;
}

interface LearningCurriculumProps {
  courseSlug: string;
  courseTitle: string;
  lessons: Lesson[];
  currentLessonId: string;
  isEnrolled: boolean;
  completedLessonIds: Set<string>;
  completedCount: number;
  progressPercent: number;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onLockedClick: (lessonId: string) => void;
}

export default function LearningCurriculum({
  courseSlug,
  courseTitle,
  lessons,
  currentLessonId,
  isEnrolled,
  completedLessonIds,
  completedCount,
  progressPercent,
  searchQuery,
  onSearchChange,
  onLockedClick,
}: LearningCurriculumProps) {
  const isReviewMode = isEnrolled && lessons.length > 0 && completedCount === lessons.length;

  return (
    <div className="flex h-full min-h-0 flex-col bg-background" aria-label="ลำดับบทเรียน">
      <div className="border-b px-5 pb-5 pt-6">
        <div className="flex items-start gap-3 pr-8">
          <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary" aria-hidden="true">
            <BookOpen className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">เนื้อหาคอร์ส</p>
            <h2 className="mt-0.5 line-clamp-2 font-heading text-base font-semibold leading-6">{courseTitle}</h2>
          </div>
        </div>

        {isEnrolled ? (
          <div className="mt-5 rounded-xl border bg-muted/30 p-3.5">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="flex items-center gap-2 font-medium">
                {isReviewMode && <Check className="size-4 text-emerald-600" aria-hidden="true" />}
                {isReviewMode ? 'เรียนครบแล้ว · กำลังทบทวน' : 'ความคืบหน้าของคุณ'}
              </span>
              <span className="shrink-0 tabular-nums text-muted-foreground">{completedCount}/{lessons.length}</span>
            </div>
            <Progress className="mt-3" value={progressPercent} aria-label={`เรียนจบแล้ว ${progressPercent}%`} />
          </div>
        ) : (
          <div className="mt-5 flex items-start gap-2 rounded-xl border bg-muted/30 p-3.5 text-sm text-muted-foreground">
            <Lock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <p>กำลังดูบทเรียนทดลอง บทที่เหลือต้องสมัครเรียนก่อน</p>
          </div>
        )}

        <div className="relative mt-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            className="pl-9"
            type="search"
            aria-label="ค้นหาบทเรียน"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="ค้นหาบทเรียน..."
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
        <LessonList
          lessons={lessons}
          courseSlug={courseSlug}
          currentLessonId={currentLessonId}
          isEnrolled={isEnrolled}
          completedLessonIds={completedLessonIds}
          searchQuery={searchQuery}
          onLockedClick={onLockedClick}
        />
      </div>
    </div>
  );
}

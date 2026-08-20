'use client';

import Link from 'next/link';
import { ArrowLeft, ListVideo, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface LearningNavbarProps {
  courseSlug: string;
  courseTitle: string;
  lessonTitle: string;
  currentIndex: number;
  totalCount: number;
  progressPercent: number;
  isEnrolled: boolean;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  onOpenSidebar: () => void;
}

export default function LearningNavbar({
  courseSlug,
  courseTitle,
  lessonTitle,
  currentIndex,
  totalCount,
  progressPercent,
  isEnrolled,
  sidebarCollapsed,
  onToggleSidebar,
  onOpenSidebar,
}: LearningNavbarProps) {
  return (
    <header className="sticky top-0 z-40 h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85" data-surface="learning" aria-label="แถบควบคุมการเรียน">
      <div className="flex h-full items-center gap-3 px-3 sm:px-5">
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          className="hidden lg:inline-flex"
          onClick={onToggleSidebar}
          aria-label={sidebarCollapsed ? 'แสดงรายการบทเรียน' : 'ซ่อนรายการบทเรียน'}
          title={sidebarCollapsed ? 'แสดงรายการบทเรียน' : 'ซ่อนรายการบทเรียน'}
          aria-pressed={sidebarCollapsed}
          data-learning-control="curriculum"
        >
          {sidebarCollapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
        </Button>
        <Button
          type="button"
          size="icon-sm"
          variant="outline"
          className="lg:hidden"
          onClick={onOpenSidebar}
          aria-label="เปิดรายการบทเรียน"
          title="เปิดรายการบทเรียน"
          data-learning-control="curriculum"
        >
          <ListVideo className="size-4" />
        </Button>

        <Link href={`/courses/${courseSlug}`} className="hidden items-center gap-2 sm:flex" aria-label={`กลับไปยังคอร์ส ${courseTitle}`}>
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-[11px] font-bold text-primary-foreground" aria-hidden="true">MD</span>
          <span className="font-heading text-sm font-semibold">MilerDev</span>
        </Link>

        <div className="mx-1 h-6 w-px bg-border sm:mx-2" aria-hidden="true" />

        <div className="min-w-0 flex-1">
          <p className="hidden truncate text-xs text-muted-foreground sm:block">{courseTitle}</p>
          <strong className="block truncate text-sm font-semibold">{lessonTitle}</strong>
        </div>

        <div className="hidden items-center gap-3 text-xs text-muted-foreground sm:flex" aria-label={isEnrolled ? `ความคืบหน้า ${progressPercent}%` : 'บทเรียนทดลอง'}>
          <span>{isEnrolled ? `${progressPercent}%` : 'ทดลองเรียน'}</span>
          <span className="tabular-nums">{currentIndex + 1} / {totalCount}</span>
        </div>

        <Button asChild size="icon-sm" variant="ghost" className="lg:h-9 lg:w-auto lg:px-3">
          <Link
            href={`/courses/${courseSlug}`}
            aria-label={`ออกจากบทเรียนและกลับไปยังคอร์ส ${courseTitle}`}
            title="กลับไปหน้าคอร์ส"
            data-learning-control="course-exit"
          >
            <ArrowLeft className="size-4" />
            <span className="hidden lg:inline">กลับหน้าคอร์ส</span>
          </Link>
        </Button>
      </div>
    </header>
  );
}

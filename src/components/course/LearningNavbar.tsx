'use client';

import Link from 'next/link';
import { MenuIcon, PanelLeftIcon, PanelRightIcon } from '@/components/ui/Icons';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

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
        <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950 text-slate-100" data-surface="learning" aria-label="แถบควบคุมการเรียน">
            <div className="grid min-h-16 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-3 sm:px-5 lg:grid-cols-[16rem_minmax(0,1fr)_14rem_auto]">
                <Link href={`/courses/${courseSlug}`} className="flex min-w-0 items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400" aria-label={`ออกจากหน้าเรียนและกลับไปยังคอร์ส ${courseTitle}`}>
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground" aria-hidden="true">MD</span>
                    <span className="hidden min-w-0 sm:block">
                        <strong className="block truncate text-sm">MilerDev Learning</strong>
                        <small className="text-xs text-slate-400">ออกจากหน้าเรียน</small>
                    </span>
                </Link>

                <div className="min-w-0">
                    <span className="hidden text-[10px] uppercase tracking-[0.18em] text-slate-500 lg:block">Learning workspace · {courseTitle}</span>
                    <strong className="block truncate text-sm">{lessonTitle}</strong>
                </div>

                <div className="hidden items-center gap-3 lg:flex" aria-label={isEnrolled ? `ความคืบหน้า ${progressPercent}%` : 'กำลังดูบทเรียนทดลอง'}>
                    <span className="whitespace-nowrap text-xs text-slate-400">{isEnrolled ? `${progressPercent}%` : 'Preview'}</span>
                    {isEnrolled && (
                        <Progress className="w-24 bg-white/10" value={progressPercent} aria-hidden="true" />
                    )}
                    <span className="whitespace-nowrap font-mono text-xs text-slate-400">{String(currentIndex + 1).padStart(2, '0')} / {String(totalCount).padStart(2, '0')}</span>
                </div>

                <div>
                    <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        className="hidden text-slate-300 hover:bg-white/10 hover:text-white lg:inline-flex"
                        onClick={onToggleSidebar}
                        aria-label={sidebarCollapsed ? 'แสดงรายการบทเรียน' : 'ซ่อนรายการบทเรียน'}
                        title={sidebarCollapsed ? 'แสดงรายการบทเรียน' : 'ซ่อนรายการบทเรียน'}
                        aria-pressed={sidebarCollapsed}
                    >
                        {sidebarCollapsed ? <PanelLeftIcon /> : <PanelRightIcon />}
                    </Button>
                    <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        className="text-slate-300 hover:bg-white/10 hover:text-white lg:hidden"
                        onClick={onOpenSidebar}
                        aria-label="เปิดรายการบทเรียน"
                        title="เปิดรายการบทเรียน"
                    >
                        <MenuIcon />
                    </Button>
                </div>
            </div>
        </header>
    );
}

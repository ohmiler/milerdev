'use client';

import Link from 'next/link';
import { MenuIcon, PanelLeftIcon, PanelRightIcon } from '@/components/ui/Icons';

export const LEARNING_THEME_KEY = 'milerdev-learning-theme';

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
    theme: 'dark' | 'light';
    onToggleTheme: () => void;
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
        <header className="nav-learning-shell" data-surface="learning" aria-label="แถบควบคุมการเรียน">
            <div className="nav-learning-rail">
                <Link href={`/courses/${courseSlug}`} className="nav-learning-exit" aria-label={`ออกจากหน้าเรียนและกลับไปยังคอร์ส ${courseTitle}`}>
                    <span className="nav-learning-mark" aria-hidden="true">MD</span>
                    <span className="nav-learning-brand">
                        <strong>MilerDev Learning</strong>
                        <small>ออกจากหน้าเรียน</small>
                    </span>
                </Link>

                <div className="nav-learning-context">
                    <span className="nav-learning-kicker">Learning workspace</span>
                    <span className="nav-learning-course">{courseTitle}</span>
                    <strong className="nav-learning-lesson">{lessonTitle}</strong>
                </div>

                <div className="nav-learning-progress" aria-label={isEnrolled ? `ความคืบหน้า ${progressPercent}%` : 'กำลังดูบทเรียนทดลอง'}>
                    <span className="nav-learning-access">{isEnrolled ? `เรียนแล้ว ${progressPercent}%` : 'Preview'}</span>
                    {isEnrolled && (
                        <div className="nav-learning-progress-track" aria-hidden="true">
                            <span style={{ width: `${progressPercent}%` }} />
                        </div>
                    )}
                    <span className="nav-learning-progress-label">{String(currentIndex + 1).padStart(2, '0')} / {String(totalCount).padStart(2, '0')}</span>
                </div>

                <div className="nav-learning-controls">
                    <button
                        type="button"
                        className="nav-learning-shell__control nav-learning-rail-toggle hidden lg:inline-flex"
                        onClick={onToggleSidebar}
                        aria-label={sidebarCollapsed ? 'แสดงรายการบทเรียน' : 'ซ่อนรายการบทเรียน'}
                        title={sidebarCollapsed ? 'แสดงรายการบทเรียน' : 'ซ่อนรายการบทเรียน'}
                        aria-pressed={sidebarCollapsed}
                    >
                        {sidebarCollapsed ? <PanelLeftIcon /> : <PanelRightIcon />}
                    </button>
                    <button
                        type="button"
                        className="nav-learning-shell__control nav-learning-rail-toggle inline-flex lg:hidden"
                        onClick={onOpenSidebar}
                        aria-label="เปิดรายการบทเรียน"
                        title="เปิดรายการบทเรียน"
                    >
                        <MenuIcon />
                    </button>
                </div>
            </div>
        </header>
    );
}

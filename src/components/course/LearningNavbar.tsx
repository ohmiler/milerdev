'use client';

import Link from 'next/link';
import { MenuIcon, MoonIcon, PanelLeftIcon, PanelRightIcon, SunIcon } from '@/components/ui/Icons';

export const LEARNING_THEME_KEY = 'milerdev-learning-theme';

export interface LearningNavbarProps {
    courseSlug: string;
    courseTitle: string;
    lessonTitle: string;
    currentIndex: number;
    totalCount: number;
    progressPercent: number;
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
    sidebarCollapsed,
    onToggleSidebar,
    onOpenSidebar,
    theme,
    onToggleTheme,
}: LearningNavbarProps) {
    return (
        <header className="nav-learning-shell" data-theme={theme} data-surface="learning" aria-label="แถบควบคุมการเรียน">
            <div className="nav-learning-rail">
                <Link href={`/courses/${courseSlug}`} className="nav-learning-exit" aria-label={`กลับไปยังคอร์ส ${courseTitle}`}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                    <span>กลับ</span>
                </Link>

                <div className="nav-learning-context">
                    <span className="nav-learning-course">{courseTitle}</span>
                    <strong className="nav-learning-lesson">{lessonTitle}</strong>
                </div>

                <div className="nav-learning-progress" aria-label={`ความคืบหน้า ${progressPercent}%`}>
                    <div className="nav-learning-progress-track" aria-hidden="true">
                        <span style={{ width: `${progressPercent}%` }} />
                    </div>
                    <span className="nav-learning-progress-label">{currentIndex + 1} / {totalCount}</span>
                </div>

                <div className="nav-learning-controls">
                    <button
                        type="button"
                        className="nav-learning-shell__control nav-learning-theme-toggle"
                        onClick={onToggleTheme}
                        aria-label={theme === 'dark' ? 'เปลี่ยนเป็นโหมดสว่าง' : 'เปลี่ยนเป็นโหมดมืด'}
                        title={theme === 'dark' ? 'เปลี่ยนเป็นโหมดสว่าง' : 'เปลี่ยนเป็นโหมดมืด'}
                        aria-pressed={theme === 'light'}
                    >
                        {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
                    </button>
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
            <style>{`
                .nav-learning-shell a:focus-visible,
                .nav-learning-shell button:focus-visible {
                    outline: none;
                    box-shadow: var(--focus-ring);
                }
                @media (prefers-reduced-motion: reduce) {
                    .nav-learning-shell * { transition: none !important; }
                }
            `}</style>
        </header>
    );
}

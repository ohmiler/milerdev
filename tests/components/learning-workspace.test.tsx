import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readSource = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('adaptive learning workspace contracts', () => {
  it('uses a light full-width shell with dark styling limited to the media player', () => {
    const workspace = readSource('src/components/course/LearnPageClient.tsx');
    const navbar = readSource('src/components/course/LearningNavbar.tsx');
    const curriculum = readSource('src/components/course/LearningCurriculum.tsx');

    expect(workspace).toContain('data-theme="light"');
    expect(workspace).toContain("lg:grid-cols-[22.5rem_minmax(0,1fr)]");
    expect(workspace).not.toContain('max-w-[1600px]');
    expect(workspace).toContain('bg-slate-950');
    expect(navbar).toContain('bg-background/95');
    expect(curriculum).toContain('bg-background');
    expect(navbar).not.toContain('bg-slate-950');
    expect(curriculum).not.toContain('bg-slate-950');
  });

  it('uses shadcn overlays and one shared curriculum for desktop and mobile', () => {
    const workspace = readSource('src/components/course/LearnPageClient.tsx');
    const curriculum = readSource('src/components/course/LearningCurriculum.tsx');

    expect(workspace).toContain("from '@/components/ui/sheet'");
    expect(workspace).toContain("from '@/components/ui/alert-dialog'");
    expect(workspace.match(/\{curriculum\}/g)).toHaveLength(2);
    expect(workspace).toContain('side="left"');
    expect(workspace.match(/onCloseAutoFocus/g)).toHaveLength(2);
    expect(workspace).toContain('mobileCurriculumTriggerRef.current.focus()');
    expect(workspace).toContain('lockedLessonTriggerRef.current.focus()');
    expect(curriculum).toContain("import { Progress } from '@/components/ui/progress';");
    expect(curriculum.match(/<Progress/g)).toHaveLength(1);
    expect(curriculum).toContain("from '@/components/ui/input-group';");
    expect(curriculum.match(/<InputGroup/g)).toHaveLength(3);
    expect(curriculum).not.toContain("from '@/components/ui/input';");
  });

  it('places the lesson curriculum on the left across desktop and mobile layouts', () => {
    const workspace = readSource('src/components/course/LearnPageClient.tsx');
    const navbar = readSource('src/components/course/LearningNavbar.tsx');

    expect(workspace).toContain('lg:order-2');
    expect(workspace).toContain('border-r');
    expect(workspace).toContain('lg:order-1');
    expect(navbar).toContain('PanelLeftOpen');
    expect(navbar).toContain('PanelLeftClose');
    expect(navbar).not.toContain('PanelRightOpen');
    expect(navbar).not.toContain('PanelRightClose');
  });

  it('pairs workspace controls with their surfaces and keeps the lesson canvas readable', () => {
    const workspace = readSource('src/components/course/LearnPageClient.tsx');
    const navbar = readSource('src/components/course/LearningNavbar.tsx');
    const curriculumControlPosition = navbar.indexOf('data-learning-control="curriculum"');
    const brandPosition = navbar.indexOf('MilerDev');
    const courseExitPosition = navbar.indexOf('data-learning-control="course-exit"');

    expect(curriculumControlPosition).toBeGreaterThan(-1);
    expect(curriculumControlPosition).toBeLessThan(brandPosition);
    expect(courseExitPosition).toBeGreaterThan(brandPosition);
    expect(workspace).toContain("'w-full max-w-6xl'");
    expect(workspace).toContain("curriculumCollapsed ? 'mx-auto' : 'mx-auto min-[1800px]:-translate-x-20 min-[2400px]:-translate-x-40'");
    expect(navbar).toContain('กลับหน้าคอร์ส');
  });

  it('keeps the loading skeleton aligned with the resolved workspace geometry', () => {
    const loading = readSource('src/app/courses/[slug]/learn/[lessonId]/loading.tsx');
    const curriculumControlPosition = loading.indexOf('data-learning-loading="curriculum-control"');
    const brandPosition = loading.indexOf('data-learning-loading="brand"');
    const courseExitPosition = loading.indexOf('data-learning-loading="course-exit"');

    expect(loading).toContain('lg:grid-cols-[22.5rem_minmax(0,1fr)]');
    expect(loading).not.toContain('lg:grid-cols-[minmax(0,1fr)_22.5rem]');
    expect(loading).toContain('lg:order-2');
    expect(loading).toContain('border-r');
    expect(loading).toContain('lg:order-1');
    expect(loading).toContain('min-[1800px]:-translate-x-20 min-[2400px]:-translate-x-40');
    expect(curriculumControlPosition).toBeGreaterThan(-1);
    expect(curriculumControlPosition).toBeLessThan(brandPosition);
    expect(courseExitPosition).toBeGreaterThan(brandPosition);
  });

  it('keeps completion one-way and removes automatic or global lesson navigation', () => {
    const workspace = readSource('src/components/course/LearnPageClient.tsx');

    expect(workspace).toContain('completed: true');
    expect(workspace).not.toContain('completed: false');
    expect(workspace).not.toContain('autoAdvanceCountdown');
    expect(workspace).not.toContain("e.key === 'ArrowLeft'");
    expect(workspace).not.toContain("e.key === 'ArrowRight'");
    expect(workspace).not.toContain('useRouter');
  });

  it('retains sanitized rich-content styling without legacy learning selectors', () => {
    const styles = readSource('src/app/globals.css');
    const workspace = readSource('src/components/course/LearnPageClient.tsx');
    const navbar = readSource('src/components/course/LearningNavbar.tsx');
    const lessonList = readSource('src/components/course/LessonList.tsx');
    const combinedComponents = `${workspace}\n${navbar}\n${lessonList}`;

    expect(styles).toContain('/* Sanitized lesson rich content */');
    expect(styles).toContain('.lesson-content pre');
    expect(styles).not.toMatch(/\.(?:learning-surface|nav-learning|learn-sidebar|lesson-list__|sidebar-overlay)/);
    expect(combinedComponents).not.toMatch(/(?:learning-surface|nav-learning|learn-sidebar|lesson-list__|sidebar-overlay)/);
  });
});

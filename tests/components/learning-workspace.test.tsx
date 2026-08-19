import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readSource = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('adaptive learning workspace contracts', () => {
  it('uses one adaptive theme without hidden legacy presentation', () => {
    const workspace = readSource('src/components/course/LearnPageClient.tsx');
    const navbar = readSource('src/components/course/LearningNavbar.tsx');

    expect(workspace).toContain('data-theme="light"');
    expect(workspace).not.toContain('legacy-learning-header');
    expect(workspace).not.toContain('LEARNING_THEME_KEY');
    expect(workspace).not.toContain('localStorage');
    expect(workspace).not.toContain('onMouseOver');
    expect(workspace).not.toMatch(/style=\{\{[^}]*#/);
    expect(navbar).not.toContain('onToggleTheme');
    expect(navbar).not.toContain("theme: 'dark' | 'light'");
  });

  it('keeps data-driven progress while using shadcn primitives and semantic states', () => {
    const workspace = readSource('src/components/course/LearnPageClient.tsx');
    const navbar = readSource('src/components/course/LearningNavbar.tsx');

    expect(workspace).toContain("import { Progress } from '@/components/ui/progress';");
    expect(workspace).toContain("import { Card, CardContent } from '@/components/ui/card';");
    expect(workspace).toContain('role="status"');
    expect(workspace).toContain('aria-label="ลำดับบทเรียน"');
    expect(workspace.match(/<Progress[^>]*value=\{progressPercent\}/g)).toHaveLength(2);
    expect(navbar).toContain('<Progress className="w-24 bg-white/10" value={progressPercent}');
  });

  it('removes legacy learning selectors while retaining sanitized rich-content styling', () => {
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

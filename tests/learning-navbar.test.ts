import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const root = process.cwd();

function readProjectFile(filePath: string) {
    return readFileSync(path.join(root, filePath), 'utf8');
}

describe('learning navbar', () => {
    test('owns the dark focus shell and persisted theme preference', () => {
        const navbar = readProjectFile('src/components/course/LearningNavbar.tsx');
        const learnPage = readProjectFile('src/components/course/LearnPageClient.tsx');

        expect(navbar).toContain('data-surface="learning"');
        expect(navbar).toContain('milerdev-learning-theme');
        expect(navbar).toContain('aria-label');
        expect(navbar).not.toContain('linear-gradient');
        expect(learnPage).toContain('LearningNavbar');
        expect(learnPage).toContain('data-theme={learningTheme}');
    });

    test('keeps learning controls accessible and touch friendly', () => {
        const navbar = readProjectFile('src/components/course/LearningNavbar.tsx');
        const globals = readProjectFile('src/app/globals.css');

        expect(navbar).toContain('aria-label');
        expect(globals).toContain('.nav-learning-shell__control');
        expect(globals).toContain('min-height: 44px;');
        expect(navbar).toContain('var(--focus-ring)');
        expect(navbar).toContain('prefers-reduced-motion');
        expect(navbar).toContain('SunIcon');
        expect(navbar).toContain('MoonIcon');
        expect(navbar).toContain('PanelLeftIcon');
        expect(navbar).toContain('PanelRightIcon');
        expect(navbar).toContain('aria-pressed={theme === \'light\'}');
        expect(navbar).not.toContain("'â˜¼'");
        expect(navbar).not.toContain("'â—'");
        expect(navbar).not.toContain('style={{ minHeight: 44 }}');
    });
});

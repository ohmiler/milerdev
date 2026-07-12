import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const root = process.cwd();

function readProjectFile(filePath: string) {
    return readFileSync(path.join(root, filePath), 'utf8');
}

describe('homepage final CTA', () => {
    test('uses a solid 12-column Swiss action rail', () => {
        const page = readProjectFile('src/app/page.tsx');
        const styles = readProjectFile('src/app/globals.css');

        expect(page).toContain('className="home-final-cta__meta"');
        expect(styles).toContain('grid-template-columns: repeat(12, minmax(0, 1fr));');
        expect(styles).toContain('.home-final-cta__title {');
        expect(styles).toContain('color: #ffffff;');
        expect(styles).toContain('grid-column: 1 / -1;');
        expect(styles).toContain('display: flex;');
        expect(styles).toContain('background: var(--accent);');
        expect(styles).toContain('.home-final-cta::before');
        expect(styles).toContain('display: none;');
    });

    test('keeps one dominant course action and a quieter registration link', () => {
        const page = readProjectFile('src/app/page.tsx');
        const styles = readProjectFile('src/app/globals.css');

        expect(page).toContain('home-final-action home-final-action--primary');
        expect(page).toContain('home-final-action home-final-action--secondary');
        expect(page).toContain('href="/courses"');
        expect(page).toContain('href="/register"');
        expect(styles).toContain('border: 1px solid rgba(255, 255, 255, 0.72);');
        expect(styles).not.toContain('.home-final-action:hover {\n  transform: translateY(-1px);');
    });
});

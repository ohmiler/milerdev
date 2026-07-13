import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const root = process.cwd();

function readProjectFile(filePath: string) {
    return readFileSync(path.join(root, filePath), 'utf8');
}

describe('homepage featured courses', () => {
    test('uses a 12-column adaptive index for the available course count', () => {
        const page = readProjectFile('src/app/page.tsx');
        const styles = readProjectFile('src/app/globals.css');

        expect(page).toContain('.limit(4)');
        expect(page).toContain('className="featured-courses-index"');
        expect(page).toContain('className="featured-courses-all"');
        expect(page).toContain('data-count={Math.min(featuredCourses.length, 4)}');
        expect(styles).toContain('grid-template-columns: repeat(12, minmax(0, 1fr));');
        expect(styles).toContain('.featured-courses-grid[data-count="2"] > *');
        expect(styles).toContain('grid-column: span 6;');
    });

    test('steps down to two columns on tablet and one on mobile', () => {
        const styles = readProjectFile('src/app/globals.css');

        expect(styles).toContain('@media (max-width: 1199px)');
        expect(styles).toContain('.featured-courses-section .featured-courses-grid > *');
        expect(styles).toContain('grid-column: span 6;');
        expect(styles).toContain('@media (max-width: 640px)');
        expect(styles).toContain('grid-column: span 12;');
        expect(styles).toContain('width: fit-content;');
    });
});
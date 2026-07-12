import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const root = process.cwd();

function readProjectFile(filePath: string) {
    return readFileSync(path.join(root, filePath), 'utf8');
}

describe('homepage client showcase', () => {
    test('presents all organizations as a static Swiss proof index', () => {
        const page = readProjectFile('src/app/page.tsx');

        expect(page).toContain('className="container client-showcase-layout"');
        expect(page).toContain('className="client-logo-grid"');
        expect(page).toContain('className="client-logo-name"');
        expect(page).toContain('grid-template-columns: repeat(12, minmax(0, 1fr));');
        expect(page).toContain('grid-column: 1 / -1;');
        expect(page).toContain('grid-column: 1 / span 8;');
        expect(page).toContain('grid-column: 9 / -1;');
        expect(page).toContain('grid-template-columns: repeat(4, minmax(0, 1fr));');
        expect(page).not.toContain('className="marquee-inner"');
        expect(page).not.toContain('@keyframes marquee');
    });

    test('uses a two-column logo index on mobile without duplicate announcements', () => {
        const page = readProjectFile('src/app/page.tsx');

        expect(page).toContain('grid-template-columns: repeat(2, minmax(0, 1fr));');
        expect(page).toContain('alt=""');
        expect(page).toContain('{logo.alt}');
        expect(page).not.toContain('[0, 1].map((copy)');
    });
});

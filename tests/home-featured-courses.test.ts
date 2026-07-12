import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const root = process.cwd();

function readProjectFile(filePath: string) {
    return readFileSync(path.join(root, filePath), 'utf8');
}

describe('homepage featured courses', () => {
    test('renders one complete four-course row on desktop', () => {
        const page = readProjectFile('src/app/page.tsx');
        const styles = readProjectFile('src/app/globals.css');

        expect(page).toContain('.limit(4)');
        expect(page).toContain('className="featured-courses-all"');
        expect(styles).toContain('grid-template-columns: repeat(4, minmax(0, 1fr));');
    });

    test('steps down to two columns on tablet and one on mobile', () => {
        const styles = readProjectFile('src/app/globals.css');

        expect(styles).toContain('@media (max-width: 1199px)');
        expect(styles).toContain('grid-template-columns: repeat(2, minmax(0, 1fr));');
        expect(styles).toContain('@media (max-width: 640px)');
        expect(styles).toContain('grid-template-columns: 1fr;');
    });
});

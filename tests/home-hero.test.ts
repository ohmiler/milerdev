import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const root = process.cwd();

function readProjectFile(filePath: string) {
    return readFileSync(path.join(root, filePath), 'utf8');
}

describe('homepage Swiss hero', () => {
    test('uses a 12-column Swiss composition with one dominant action', () => {
        const page = readProjectFile('src/app/page.tsx');
        const styles = readProjectFile('src/app/globals.css');

        expect(page).toContain('className="hero-meta hero-badge-anim"');
        expect(page).toContain('MILERDEV / CODING STUDIO');
        expect(page).toContain('className="hero-secondary-action"');
        expect(page).toContain('className="hero-process hero-cta-anim"');
        expect(styles).toContain('grid-template-columns: repeat(12, minmax(0, 1fr));');
        expect(styles).toContain('grid-column: 1 / span 5;');
        expect(styles).toContain('grid-column: 6 / span 7;');
    });

    test('keeps VS Code Dark+ while replacing window decoration with useful metadata', () => {
        const editor = readProjectFile('src/components/home/HeroCodeEditor.tsx');

        expect(editor).toContain('VS CODE DARK+');
        expect(editor).toContain('WORKSPACE / MILERDEV');
        expect(editor).toContain('background: #1e1e1e;');
        expect(editor).toContain('border-radius: 8px;');
        expect(editor).not.toContain('hero-code-editor__traffic');
        expect(editor).not.toContain('hero-code-editor__dot--danger');
        expect(editor).toContain('@media (prefers-reduced-motion: reduce)');
    });
});

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const root = process.cwd();

function readProjectFile(filePath: string) {
    return readFileSync(path.join(root, filePath), 'utf8');
}

describe('homepage showcase gallery', () => {
    test('renders all twelve images as a static Swiss contact sheet', () => {
        const gallery = readProjectFile('src/components/home/ShowcaseGallery.tsx');

        expect(gallery).toContain('className="showcase-contact-sheet"');
        expect(gallery).toContain('SHOWCASE_IMAGES.map((img, i)');
        expect(gallery).toContain('grid-template-columns: repeat(4, minmax(0, 1fr));');
        expect(gallery).toContain('className="showcase-card-index"');
        expect(gallery).toContain('EVENT ARCHIVE / 01—12');
        expect(gallery).toContain('TH / TALKS + WORKSHOPS');
        expect(gallery).toContain('KEYNOTE / ISCHOOL KKU');
        expect(gallery).toContain('{img.label}');
        expect(gallery).not.toContain('<span>ดูภาพเต็ม ↗</span>');
        expect(gallery).toContain('background: #1e1e1e;');
        expect(gallery).toContain('background: #252526;');
        expect(gallery).toContain('border-right: 1px solid #3c3c3c;');
        expect(gallery).toContain('color: #02abff;');
        expect(gallery).not.toContain('showcase-marquee-inner');
        expect(gallery).not.toContain('@keyframes showcaseScroll');
        expect(gallery).not.toContain('📸');
    });

    test('adapts to two and one columns while preserving the accessible lightbox', () => {
        const gallery = readProjectFile('src/components/home/ShowcaseGallery.tsx');

        expect(gallery).toContain('grid-template-columns: repeat(2, minmax(0, 1fr));');
        expect(gallery).toContain('grid-template-columns: 1fr;');
        expect(gallery).toContain('role="dialog"');
        expect(gallery).toContain('aria-modal="true"');
        expect(gallery).toContain('previousFocus?.focus({ preventScroll: true })');
    });
});

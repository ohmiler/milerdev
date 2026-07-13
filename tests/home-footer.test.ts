import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const footer = readFileSync(path.join(process.cwd(), 'src/components/layout/Footer.tsx'), 'utf8');

describe('public footer', () => {
    test('uses the VS Code Dark Plus canvas and a Swiss 12-column grid', () => {
        expect(footer).toContain('--footer-bg: #1e1e1e;');
        expect(footer).toContain('grid-template-columns: repeat(12, minmax(0, 1fr));');
        expect(footer).toContain('grid-column: 1 / span 5;');
        expect(footer).toContain('grid-column: 10 / span 3;');
        expect(footer).toContain('SITE DIRECTORY / MILERDEV');
        expect(footer).toContain('grid-template-columns: repeat(2, minmax(0, 1fr));');
    });

    test('preserves navigation, contact, and accessible social links', () => {
        expect(footer).toContain("href: '/courses'");
        expect(footer).toContain("href: '/privacy'");
        expect(footer).toContain('mailto:milerdev.official@gmail.com');
        expect(footer).toContain('aria-label="ติดตาม MilerDev บน Facebook"');
        expect(footer).toContain('<span aria-hidden="true">01</span>');
        expect(footer).toContain('<span aria-hidden="true">02</span>');
        expect(footer).toContain('<span aria-hidden="true">03</span>');
        expect(footer).toContain('<span aria-hidden="true">→</span>');
        expect(footer).toContain('@media (prefers-reduced-motion: reduce)');
    });
});

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const root = process.cwd();

function readProjectFile(filePath: string) {
    return readFileSync(path.join(root, filePath), 'utf8');
}

function cssBlock(source: string, selector: string) {
    const start = source.indexOf(selector);
    expect(start).toBeGreaterThanOrEqual(0);
    const open = source.indexOf('{', start);
    expect(open).toBeGreaterThanOrEqual(0);

    let depth = 0;
    for (let i = open; i < source.length; i++) {
        if (source[i] === '{') depth++;
        if (source[i] === '}') depth--;
        if (depth === 0) return source.slice(open + 1, i);
    }

    throw new Error(`CSS block not closed: ${selector}`);
}

describe('homepage hardening', () => {
    test('scroll reveal enhancement never hides homepage content by default', () => {
        const globals = readProjectFile('src/app/globals.css');
        const revealBlock = cssBlock(globals, '.reveal-enabled [data-reveal]');

        expect(revealBlock).not.toMatch(/opacity:\s*0\b/);
        expect(revealBlock).not.toMatch(/visibility:\s*hidden\b/);
    });

    test('announcement banner fetch is abortable and ignores non-ok responses', () => {
        const banner = readProjectFile('src/components/layout/AnnouncementBanner.tsx');

        expect(banner).toContain('AbortController');
        expect(banner).toMatch(/if\s*\(!res\.ok\)/);
        expect(banner).toContain('controller.abort()');
        expect(banner).toContain("minWidth: '44px'");
        expect(banner).toContain("minHeight: '44px'");
    });

    test('homepage carousel dots have accessible hit area and current state', () => {
        const carousel = readProjectFile('src/components/home/AffiliateBannerCarousel.tsx');

        expect(cssBlock(carousel, '.affiliate-dot {')).toContain('min-width: 44px');
        expect(cssBlock(carousel, '.affiliate-dot {')).toContain('min-height: 44px');
        expect(carousel).toContain('aria-current');
    });

    test('footer links and social buttons meet minimum touch target sizing', () => {
        const footer = readProjectFile('src/components/layout/Footer.tsx');

        expect(footer).toContain('footerLinkStyle');
        expect(footer).toContain("minHeight: '44px'");
        expect(footer).toContain("width: '44px'");
        expect(footer).toContain("height: '44px'");
    });
});

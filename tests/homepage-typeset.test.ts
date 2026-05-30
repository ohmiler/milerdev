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

describe('homepage typesetting', () => {
    test('root layout loads IBM Plex Sans Thai through next font', () => {
        const layout = readProjectFile('src/app/layout.tsx');

        expect(layout).toContain('IBM_Plex_Sans_Thai');
        expect(layout).toContain('variable: "--font-ibm-plex-sans-thai"');
        expect(layout).toContain('className={`${inter.variable} ${ibmPlexSansThai.variable}`}');
        expect(layout).toContain('className="antialiased"');
        expect(layout).not.toContain('Noto_Sans_Thai');
    });

    test('global typography tokens define the MilerDev homepage type ramp', () => {
        const globals = readProjectFile('src/app/globals.css');
        const rootBlock = cssBlock(globals, ':root');

        expect(rootBlock).toContain('--font-display: var(--font-ibm-plex-sans-thai), var(--font-inter), sans-serif');
        expect(rootBlock).toContain('--font-body: var(--font-ibm-plex-sans-thai), var(--font-inter), sans-serif');
        expect(rootBlock).toContain('--text-display-xl: 3.5rem');
        expect(rootBlock).toContain('--text-h2: 1.75rem');
        expect(rootBlock).toContain('--leading-thai: 1.75');
        expect(rootBlock).toContain('--measure-prose: 68ch');
    });

    test('body and headings use readable Thai defaults without letter-spacing hacks', () => {
        const globals = readProjectFile('src/app/globals.css');

        expect(cssBlock(globals, '\nbody')).toContain('font-family: var(--font-body)');
        expect(cssBlock(globals, '\nbody')).toContain('font-kerning: normal');
        expect(cssBlock(globals, '\nbody')).toContain('letter-spacing: 0');
        expect(cssBlock(globals, 'h1, h2, h3, h4, h5, h6')).toContain('font-family: var(--font-display)');
        expect(cssBlock(globals, 'h1, h2, h3, h4, h5, h6')).toContain('letter-spacing: 0');
    });

    test('homepage headings and ledes use fixed product scale with balanced wrapping', () => {
        const globals = readProjectFile('src/app/globals.css');
        const page = readProjectFile('src/app/page.tsx');
        const heroTitle = cssBlock(globals, '.hero-title');
        const sectionTitle = cssBlock(globals, '.section-title');
        const lede = cssBlock(globals, '.home-lede');

        expect(heroTitle).toContain('font-size: var(--text-display-xl)');
        expect(heroTitle).toContain('line-height: 1.22');
        expect(heroTitle).toContain('text-wrap: balance');
        expect(sectionTitle).toContain('font-size: var(--text-h2)');
        expect(sectionTitle).toContain('text-wrap: balance');
        expect(lede).toContain('max-width: var(--measure-prose)');
        expect(lede).toContain('text-wrap: pretty');
        expect(heroTitle).not.toContain('clamp(');
        expect(sectionTitle).not.toContain('clamp(');
        expect(heroTitle).toContain('width: max-content');
        expect(cssBlock(globals, '.hero-title .hero-title__line')).toContain('display: block');
        expect(cssBlock(globals, '.hero-title .hero-title__line')).toContain('white-space: nowrap');
        expect(cssBlock(globals, '.hero-text .hero-title')).toContain('margin-left: auto');
        expect(cssBlock(globals, '.hero-text .hero-title')).toContain('margin-right: auto');
        expect(globals).toContain('font-size: 1.9375rem');
        expect(globals).toContain('font-size: 1.75rem');
        expect(page).toContain('<span className="hero-title__line">เรียน Coding ตั้งแต่พื้นฐาน</span>');
        expect(page).toContain('<span className="hero-title__line highlight">จนสร้างโปรเจกต์จริงได้</span>');
        expect(page).not.toContain('<span className="highlight">จนสร้างโปรเจกต์จริงได้</span>');
        expect(page).toContain('เริ่มตามเส้นทางการเรียน');
        expect(page).not.toContain('เลือกเส้นทางการเรียนของคุณ');
    });

    test('homepage typography does not rely on gradient-clipped text', () => {
        const homepageTypography = [
            readProjectFile('src/app/globals.css'),
            readProjectFile('src/app/page.tsx'),
            readProjectFile('src/components/home/ShowcaseGallery.tsx'),
            readProjectFile('src/components/home/AffiliateBannerCarousel.tsx'),
        ].join('\n');

        expect(homepageTypography).not.toContain('-webkit-background-clip: text');
        expect(homepageTypography).not.toContain('background-clip: text');
        expect(homepageTypography).not.toContain('-webkit-text-fill-color: transparent');
        expect(homepageTypography).not.toContain('shimmer-text');
    });
});

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

describe('homepage polish', () => {
    test('bundle section avoids decorative gift motion and reads as product UI', () => {
        const page = readProjectFile('src/app/page.tsx');

        expect(page).toContain('bundle-program-section');
        expect(page).toContain('bundle-program-card');
        expect(page).not.toContain('bundle-particles');
        expect(page).not.toContain('particleFloat');
        expect(page).not.toContain('giftBounce');
        expect(page).not.toContain('giftPulse');
        expect(page).not.toContain('badgePop');
        expect(page).not.toContain('shimmerSlide');
        expect(page).not.toContain('bundle-card-shimmer');
        expect(page).not.toMatch(/cubic-bezier\([^)]*-/);
    });

    test('carousel pagination uses transform transitions instead of layout width animation', () => {
        const carousel = readProjectFile('src/components/home/AffiliateBannerCarousel.tsx');

        expect(carousel).not.toContain('transition: \'width');
        expect(carousel).toContain('transition: \'transform 0.2s ease, background-color 0.2s ease\'');
        expect(carousel).toContain('transform: current === i ? \'scaleX(1)\' : \'scaleX(0.35)\'');
    });

    test('homepage shared buttons and final CTA expose focus-visible polish', () => {
        const globals = readProjectFile('src/app/globals.css');
        const page = readProjectFile('src/app/page.tsx');

        expect(cssBlock(globals, '.btn:focus-visible')).toContain('box-shadow: var(--focus-ring)');
        expect(cssBlock(globals, '.home-final-action:focus-visible')).toContain('box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.36)');
        expect(page).toContain('className="home-final-action home-final-action--primary"');
        expect(page).toContain('className="home-final-action home-final-action--secondary"');
        expect(page).not.toContain("transition: 'all 0.3s ease'");
    });

    test('global rich content blockquotes avoid thick side-tab accents', () => {
        const globals = readProjectFile('src/app/globals.css');

        expect(globals).not.toMatch(/border-left:\s*[3-9]px\s+solid/);
        expect(globals).toContain('border: 1px solid #dbe8f2 !important');
        expect(globals).toContain('border: 1px solid #334155');
    });

    test('learning path reads as a connected route without heavy card shadows', () => {
        const globals = readProjectFile('src/app/globals.css');

        expect(cssBlock(globals, '.lp-track::before')).toContain('background: var(--primary-200)');
        expect(cssBlock(globals, '.lp-step {')).toContain('border-radius: 12px');
        expect(cssBlock(globals, '.lp-step:hover')).toContain('transform: translateY(-2px)');
        expect(cssBlock(globals, '.lp-step:hover')).not.toContain('0 18px 40px');
        expect(cssBlock(globals, '.lp-step:focus-visible')).toContain('box-shadow: var(--focus-ring)');
        expect(globals).toContain('.lp-step-item:not(:last-child) .lp-step::after');
        expect(globals).toContain('height: calc(100% + 20px)');
    });
});

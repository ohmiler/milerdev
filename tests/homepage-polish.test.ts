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
        expect(page).toContain('className="container bundle-program-layout"');
        expect(page).toContain('className="bundle-program-copy"');
        expect(page).toContain('bundle-program-card');
        expect(page).not.toContain('padding: 100px 0');
        expect(page).not.toContain('background: linear-gradient(135deg, #071827');
        expect(cssBlock(page, '.bundle-program-section {')).toContain('padding: 56px 0');
        expect(cssBlock(page, '.bundle-card-content {')).toContain('grid-template-columns: minmax(0, 1fr) 220px');
        expect(page).not.toContain('bundle-particles');
        expect(page).not.toContain('particleFloat');
        expect(page).not.toContain('giftBounce');
        expect(page).not.toContain('giftPulse');
        expect(page).not.toContain('badgePop');
        expect(page).not.toContain('shimmerSlide');
        expect(page).not.toContain('bundle-card-shimmer');
        expect(page).not.toMatch(/cubic-bezier\([^)]*-/);
    });

    test('client showcase marquee is restrained, accessible, and motion-safe', () => {
        const page = readProjectFile('src/app/page.tsx');

        expect(page).toContain('const CLIENT_LOGOS');
        expect(page).toContain('className="client-showcase-section"');
        expect(page).toContain('aria-labelledby="client-showcase-title"');
        expect(page).not.toContain('alt={`Client ${num}`}');
        expect(page).not.toContain('transition: all 0.3s');
        expect(page).toContain('alt={copy === 0 && i < CLIENT_LOGOS.length ? logo.alt : \'\'}');
        expect(cssBlock(page, '.marquee-item {')).toContain('flex: 0 0 168px');
        expect(cssBlock(page, '.marquee-logo {')).toContain('max-height: 56px');
        expect(page).toContain('@media (prefers-reduced-motion: reduce)');
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

    test('trust section reads as one compact proof system', () => {
        const globals = readProjectFile('src/app/globals.css');
        const page = readProjectFile('src/app/page.tsx');

        expect(page).toContain('className="trust-section__head"');
        expect(page).toContain('className="trust-reasons"');
        expect(page).toContain('className="trust-reason"');
        expect(page).not.toContain('className="feature-card-hover" data-reveal');
        expect(page).not.toContain("textAlign: 'center', padding: '32px 24px'");

        const stats = cssBlock(globals, '.trust-stats {');
        expect(stats).toContain('border-radius: 14px');
        expect(stats).toContain('box-shadow: 0 10px 24px');
        expect(stats).not.toContain('0 24px 60px');

        const reason = cssBlock(globals, '.trust-reason {');
        expect(reason).toContain('grid-template-columns: auto 1fr');
        expect(reason).toContain('border: 1px solid var(--gray-200)');
        expect(reason).toContain('border-radius: 12px');
        expect(reason).not.toContain('box-shadow');
        expect(cssBlock(globals, '.trust-reason__copy')).toContain('line-height: var(--leading-body)');
    });

    test('featured courses section uses a compact homepage card system', () => {
        const globals = readProjectFile('src/app/globals.css');
        const page = readProjectFile('src/app/page.tsx');
        const courseCard = readProjectFile('src/components/course/CourseCard.tsx');

        expect(page).toContain('id="featured-courses"');
        expect(page).toContain('className="featured-courses-head"');
        expect(page).toContain('className="featured-courses-grid"');
        expect(page).toContain('variant="featured"');
        expect(page).not.toContain("gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))'");

        expect(courseCard).toContain("variant?: 'default' | 'featured'");
        expect(courseCard).toContain("variant = 'default'");
        expect(courseCard).toContain('course-card--${variant}');
        expect(courseCard).toContain('course-card__content');
        expect(courseCard).not.toContain("border: '1px solid #f5a524'");

        expect(cssBlock(globals, '.featured-courses-grid {')).toContain('grid-template-columns: repeat(auto-fit, minmax(250px, 1fr))');
        expect(cssBlock(globals, '.course-card {')).toContain('display: flex');
        expect(cssBlock(globals, '.course-card--featured .cc-outcomes')).toContain('min-height');
        expect(cssBlock(globals, '.course-card:focus-visible')).toContain('box-shadow: var(--focus-ring)');
        expect(cssBlock(globals, '.course-card--featured .price-badge.promo')).toContain('background: var(--primary-800)');
        expect(cssBlock(globals, '.course-card--featured .course-discount-badge')).toContain('background: #fff4d8');
        expect(cssBlock(globals, '.course-card--featured .course-discount-badge')).toContain('color: #9a5a00');
    });

    test('audience fit section works as a decision aid, not matching cards', () => {
        const globals = readProjectFile('src/app/globals.css');
        const page = readProjectFile('src/app/page.tsx');

        expect(page).toContain('id="audience-fit"');
        expect(page).toContain('className="section audience-section"');
        expect(page).toContain('className="audience-head"');
        expect(page).toContain('className="section-copy audience-note"');

        expect(cssBlock(globals, '.audience-grid {')).toContain('grid-template-columns: minmax(0, 1.08fr) minmax(0, 0.92fr)');
        expect(cssBlock(globals, '.audience-col {')).toContain('border-radius: 14px');
        expect(cssBlock(globals, '.audience-col--yes {')).toContain('background: linear-gradient(180deg, #ffffff 0%, var(--primary-50) 100%)');
        expect(cssBlock(globals, '.audience-col--no {')).toContain('background: #ffffff');
        expect(cssBlock(globals, '.audience-col--no {')).toContain('border-style: dashed');
        expect(cssBlock(globals, '.audience-item {')).toContain('grid-template-columns: 22px 1fr');
    });
});

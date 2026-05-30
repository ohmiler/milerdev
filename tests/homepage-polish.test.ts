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
    test('hero code editor reads as a branded product surface', () => {
        const editor = readProjectFile('src/components/home/HeroCodeEditor.tsx');

        expect(editor).toContain('const syntax = {');
        const htmlIndex = editor.indexOf("fileName: 'index.html'");
        const cssIndex = editor.indexOf("fileName: 'styles.css'");
        const jsIndex = editor.indexOf("fileName: 'app.js'");

        expect(htmlIndex).toBeGreaterThanOrEqual(0);
        expect(cssIndex).toBeGreaterThan(htmlIndex);
        expect(jsIndex).toBeGreaterThan(cssIndex);
        expect(editor).toContain("html: 'HTML'");
        expect(editor).toContain("css: 'CSS'");
        expect(editor).toContain("js: 'JavaScript'");
        expect(editor).toContain('className="hero-code-editor"');
        expect(editor).toContain('role="tablist"');
        expect(editor).toContain('type="button"');
        expect(editor).toContain('aria-selected={i === snippetIndex}');
        expect(editor).toContain('window.matchMedia(\'(prefers-reduced-motion: reduce)\')');
        expect(editor).not.toContain("transition: 'all 0.2s'");
        expect(editor).not.toContain('rotateY');
        expect(editor).not.toContain("boxShadow: '0 25px 60px");
        expect(cssBlock(editor, '.hero-code-editor {')).toContain('border-radius: 12px');
        expect(cssBlock(editor, '.hero-code-editor {')).toContain('rgba(0, 171, 255, 0.18)');
        expect(cssBlock(editor, '.hero-code-editor {')).toContain('border: 1px solid rgba(0, 171, 255, 0.32)');
        expect(cssBlock(editor, '.hero-code-editor {')).toContain('font-family: var(--font-code)');
        expect(cssBlock(editor, '.hero-code-editor__titlebar,')).toContain('backdrop-filter: blur(10px)');
        expect(cssBlock(editor, '.hero-code-editor__tab[data-active="true"]')).toContain('linear-gradient(135deg, rgba(0, 171, 255, 0.26)');
        expect(cssBlock(editor, '.hero-code-editor__body {')).toContain('height: 320px');
        expect(cssBlock(editor, '.hero-code-editor__body {')).toContain('#111a2e');
        expect(cssBlock(editor, '.hero-code-editor__body {')).toContain('overflow-y: auto');
        expect(cssBlock(editor, '.hero-code-editor__body {')).toContain('scrollbar-gutter: stable');
        expect(cssBlock(editor, '.hero-code-editor__tab:focus-visible')).toContain('box-shadow: 0 0 0 3px rgba(2, 171, 255, 0.28)');
        expect(cssBlock(editor, '.hero-code-editor__line[data-current="true"]')).toContain('background: rgba(2, 171, 255, 0.08)');
        expect(editor).toContain("codeBodyRef.current?.scrollTo({ top: 0, behavior: 'auto' })");
        expect(editor).toContain('@media (prefers-reduced-motion: reduce)');
    });

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
        expect(cssBlock(page, '\n              .bundle-cta-arrow {')).toContain('background: var(--primary-gradient)');
        expect(cssBlock(page, '.bundle-program-card:hover .bundle-cta-arrow')).toContain('background-position: 100% 50%');
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

    test('showcase gallery supports keyboard, reduced motion, and modal semantics', () => {
        const gallery = readProjectFile('src/components/home/ShowcaseGallery.tsx');

        expect(gallery).toContain('className="showcase-gallery-section"');
        expect(gallery).toContain('aria-labelledby="showcase-gallery-title"');
        expect(gallery).toContain('tabIndex={copy === 0 ? 0 : -1}');
        expect(gallery).toContain('role="dialog"');
        expect(gallery).toContain('aria-modal="true"');
        expect(gallery).toContain('const lightboxRef = useRef<HTMLDivElement>(null)');
        expect(gallery).toContain('closeButtonRef.current?.focus()');
        expect(gallery).toContain('previousFocus?.focus({ preventScroll: true })');
        expect(gallery).toContain('zIndex: 120');
        expect(gallery).not.toContain('zIndex: 9999');
        expect(gallery).not.toContain("transition: 'transform 0.4s'");
        expect(cssBlock(gallery, '.showcase-card {')).toContain('width: 344px');
        expect(cssBlock(gallery, '.showcase-card:focus-visible')).toContain('box-shadow: var(--focus-ring)');
        expect(gallery).toContain('.showcase-marquee-wrapper:focus-within .showcase-marquee-inner');
        expect(gallery).toContain('@media (prefers-reduced-motion: reduce)');
    });

    test('carousel pagination uses transform transitions instead of layout width animation', () => {
        const carousel = readProjectFile('src/components/home/AffiliateBannerCarousel.tsx');

        expect(carousel).not.toContain('transition: \'wid' + 'th');
        expect(cssBlock(carousel, '.affiliate-dot__mark {')).toContain('transition: transform 0.2s ease, background-color 0.2s ease');
        expect(cssBlock(carousel, '.affiliate-dot__mark {')).toContain('transform: scaleX(0.35)');
        expect(cssBlock(carousel, '.affiliate-dot__mark[data-active="true"]')).toContain('transform: scaleX(1)');
    });

    test('affiliate carousel is keyboard-friendly and motion-safe', () => {
        const carousel = readProjectFile('src/components/home/AffiliateBannerCarousel.tsx');

        expect(carousel).toContain('className="affiliate-section"');
        expect(carousel).toContain('aria-labelledby="affiliate-carousel-title"');
        expect(carousel).toContain('onFocus={() => setIsPaused(true)}');
        expect(carousel).toContain('aria-label={`${banner.title} เปิดในแท็บใหม่`}');
        expect(carousel).toContain('aria-label="ดูรายการก่อนหน้า"');
        expect(carousel).toContain('aria-label="ดูรายการถัดไป"');
        expect(cssBlock(carousel, '.affiliate-viewport {')).toContain('border-radius: 12px');
        expect(cssBlock(carousel, '.affiliate-slide:focus-visible .affiliate-image')).toContain('box-shadow: inset 0 0 0 3px rgba(2, 171, 255, 0.5)');
        expect(carousel).toContain('@media (prefers-reduced-motion: reduce)');
    });

    test('homepage shared buttons and final CTA expose focus-visible polish', () => {
        const globals = readProjectFile('src/app/globals.css');
        const page = readProjectFile('src/app/page.tsx');

        expect(cssBlock(globals, '.btn:focus-visible')).toContain('box-shadow: var(--focus-ring)');
        expect(globals).toContain('--primary-gradient: linear-gradient(135deg, #00abff 0%, var(--primary-600) 100%)');
        expect(cssBlock(globals, '.btn-primary {')).toContain('background: var(--primary-gradient)');
        expect(cssBlock(globals, '.btn-primary:hover')).toContain('background: var(--primary-gradient-hover)');
        expect(cssBlock(globals, '.cta-section {')).toContain('background: var(--primary-gradient-deep)');
        expect(cssBlock(globals, '.lp-step__num {')).toContain('background: var(--primary-gradient)');
        expect(cssBlock(globals, '.card:hover .cc-cta')).toContain('background: var(--primary-gradient)');
        expect(cssBlock(globals, '.home-final-action:focus-visible')).toContain('box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.36)');
        expect(cssBlock(globals, '.home-final-cta {')).toContain('padding: 88px 0 92px');
        expect(cssBlock(globals, '.home-final-cta::before')).toContain('background: linear-gradient(90deg');
        expect(cssBlock(globals, '.home-final-action--primary:hover svg')).toContain('transform: translateX(3px)');
        expect(page).toContain('className="home-final-action home-final-action--primary"');
        expect(page).toContain('className="home-final-action home-final-action--secondary"');
        expect(page).not.toContain("transition: 'all 0.3s ease'");
    });

    test('footer interactions use explicit states instead of inline hover mutation', () => {
        const footer = readProjectFile('src/components/layout/Footer.tsx');

        expect(footer).toContain('className="footer-brand-link"');
        expect(footer).toContain('className="footer-link"');
        expect(footer).toContain('className="footer-social footer-social--facebook"');
        expect(footer).toContain('className="footer-social footer-social--youtube"');
        expect(footer).not.toContain("transition: 'all 0.2s'");
        expect(footer).not.toContain('onMouseOver');
        expect(footer).not.toContain('onMouseOut');
        expect(cssBlock(footer, '.footer-link:hover')).toContain('color: #7dd3fc !important');
        expect(cssBlock(footer, '.footer-social:hover')).toContain('transform: translateY(-1px)');
        expect(cssBlock(footer, '.footer-social:focus-visible')).toContain('box-shadow: 0 0 0 3px rgba(2, 171, 255, 0.32)');
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
        expect(stats).toContain('background: var(--primary-gradient-deep)');
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

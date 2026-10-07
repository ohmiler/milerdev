import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readSource = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('Home spacing foundation', () => {
  it('keeps the legacy universal reset from overriding Tailwind spacing utilities', () => {
    const globals = readSource('src/app/globals.css');
    const universalRules = globals.match(/(?:^|\n)\s*\*\s*\{[^}]+\}/g) ?? [];
    const sizingRule = universalRules.find((rule) => rule.includes('box-sizing')) ?? '';

    expect(sizingRule).toContain('box-sizing: border-box;');
    expect(sizingRule).not.toMatch(/margin\s*:/);
    expect(sizingRule).not.toMatch(/padding\s*:/);
  });

  it('limits the shared container to inline gutters', () => {
    const globals = readSource('src/app/globals.css');
    const containerRule = globals.match(/\/\* Container \*\/\s*\.container\s*\{[^}]+\}/)?.[0] ?? '';

    expect(containerRule).toContain('padding-inline: 1.5rem;');
    expect(containerRule).not.toMatch(/padding\s*:/);
  });

  // ADR 0012: hero, how, courses, studio-proof, reviews (only with verified reviews), faq, final-cta.
  it('marks the approved Home sections for rendered spacing checks', () => {
    const home = readSource('src/app/page.tsx');
    const studioProof = readSource('src/components/home/StudioProofSection.tsx');
    const reviews = readSource('src/components/home/HomeReviews.tsx');

    for (const section of [
      'hero',
      'how',
      'courses',
      'faq',
      'final-cta',
    ]) {
      expect(home).toContain(`data-home-section="${section}"`);
    }

    expect(studioProof).toContain(`data-home-section="studio-proof"`);
    expect(reviews).toContain(`data-home-section="reviews"`);
    expect(home).toContain('reviews.length > 0 ? <HomeReviews');
  });

  it('exposes the type scale as utilities instead of one-off sizes', () => {
    const globals = readSource('src/app/globals.css');
    const theme = globals.match(/@theme inline\s*\{[^}]+\}/)?.[0] ?? '';

    for (const step of ['display', 'h1', 'h2', 'h3', 'lead', 'caption']) {
      expect(theme).toContain(`--text-${step}: var(--type-${step});`);
      expect(globals).toMatch(new RegExp(`--type-${step}: [^;]+;`));
    }
    // Thai stacks marks above and below the line: headings never get a line height under 1.22.
    expect(globals).toContain('--leading-display: 1.22;');
    expect(readSource('src/components/layout/SectionHeader.tsx')).toContain('text-h2');
  });

  it('gives every Home section heading the shared SectionHeader instead of its own size', () => {
    for (const path of [
      'src/app/page.tsx',
      'src/components/home/StudioProofSection.tsx',
      'src/components/home/HomeReviews.tsx',
    ]) {
      const source = readSource(path);
      expect(source, path).toContain('<SectionHeader');
      expect(source, path).not.toMatch(/<h2\b/);
      expect(source, path).not.toMatch(/\btext-\[(?:clamp|\d)/);
    }
    expect(readSource('src/app/page.tsx')).toContain('className="text-display font-bold"');
  });
});

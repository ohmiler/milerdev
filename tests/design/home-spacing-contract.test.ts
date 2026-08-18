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

  it('marks the approved Home sections for rendered spacing checks', () => {
    const home = readSource('src/app/page.tsx');
    const studioProof = readSource('src/components/home/StudioProofSection.tsx');

    for (const section of [
      'hero',
      'confidence',
      'outcomes',
      'courses',
      'faq',
      'final-cta',
    ]) {
      expect(home).toContain(`data-home-section="${section}"`);
    }

    expect(studioProof).toContain(`data-home-section="studio-proof"`);
  });
});

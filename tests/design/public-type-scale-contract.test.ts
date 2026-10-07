import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readSource = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

// A heading that sets its own Tailwind size instead of a type-scale utility.
const ONE_OFF_HEADING = /<h[12]\b[^>]*className=\{?['"][^'"]*\btext-(?:\d?xl|\[\d)/;

describe('public pages use the shared type scale', () => {
  it('builds page sections from SectionHeader', () => {
    for (const path of [
      'src/app/about/page.tsx',
      'src/app/courses/page.tsx',
      'src/app/bundles/[slug]/page.tsx',
      'src/app/faq/page.tsx',
      'src/app/stack/page.tsx',
    ]) {
      const source = readSource(path);
      expect(source, path).toContain('<SectionHeader');
      expect(source, path).not.toMatch(ONE_OFF_HEADING);
    }
  });

  it('sizes page titles with text-h1', () => {
    for (const path of [
      'src/components/layout/PublicPageHeader.tsx',
      'src/app/bundles/[slug]/page.tsx',
      'src/app/faq/page.tsx',
      'src/app/certificate/[code]/page.tsx',
    ]) {
      const source = readSource(path);
      expect(source, path).toMatch(/<h1\b[^>]*\btext-h1\b/);
      expect(source, path).not.toMatch(ONE_OFF_HEADING);
    }
  });
});

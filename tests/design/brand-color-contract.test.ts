import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readSource = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

const relativeLuminance = (hex: string) => {
  const channels = hex
    .replace('#', '')
    .match(/.{2}/g)!
    .map((channel) => Number.parseInt(channel, 16) / 255)
    .map((channel) => (
      channel <= 0.04045
        ? channel / 12.92
        : ((channel + 0.055) / 1.055) ** 2.4
    ));

  return (0.2126 * channels[0]) + (0.7152 * channels[1]) + (0.0722 * channels[2]);
};

const contrastRatio = (foreground: string, background: string) => {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);

  return (lighter + 0.05) / (darker + 0.05);
};

const accentSurfaceFiles = [
  'src/app/globals.css',
  'src/app/about/page.tsx',
  'src/app/blog/page.tsx',
  'src/app/courses/page.tsx',
  'src/app/faq/page.tsx',
  'src/app/page.tsx',
  'src/components/account/LearnerAccountShell.tsx',
  'src/components/account/learner-account-styles.ts',
  'src/components/blog/ShareButtons.tsx',
  'src/components/bundle/BundleEnrollButton.tsx',
  'src/components/content/PublicContentHeader.tsx',
  'src/components/course/CourseReviews.tsx',
  'src/components/course/EnrollButton.tsx',
  'src/components/course/LearnPageClient.tsx',
  'src/components/layout/PublicNavbar.tsx',
  'src/components/proof/TransactionReceipt.tsx',
  'src/components/status/StatusSurface.tsx',
  'src/components/ui/FormControls.tsx',
];

describe('MilerDev brand color contract', () => {
  it('pairs exact MilerDev blue with a readable semantic foreground', () => {
    const globals = readSource('src/app/globals.css');

    expect(globals).toContain('--color-accent: #00abff;');
    expect(globals).toContain('--color-on-accent: #061923;');
    expect(globals).toContain('--accent-foreground: var(--color-on-accent);');
    expect(globals).toContain('--color-on-accent-strong: #ffffff;');
    expect(globals).toContain('--accent-strong-foreground: var(--color-on-accent-strong);');
    expect(contrastRatio('#061923', '#00abff')).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio('#ffffff', '#0075b3')).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio('#061923', '#33bcff')).toBeGreaterThanOrEqual(4.5);
  });

  it('uses MilerDev blue for the Home primary action', () => {
    const globals = readSource('src/app/globals.css');
    const home = readSource('src/app/page.tsx');
    const button = readSource('src/components/ui/button.tsx');

    expect(home).toContain("eventName: 'home_primary_cta_clicked'");
    expect(home).toContain('ดูคอร์สทั้งหมด');
    expect(button).toContain('bg-primary');
    expect(globals).toContain('--primary: var(--color-accent);');
    expect(globals).toContain('--primary-foreground: var(--color-on-accent);');
  });

  it('does not pair white text directly with exact accent surfaces in scoped learner UI', () => {
    const whiteOnExactAccent = /background:\s*var\(--(?:accent|color-accent|home-blue)\)[^}]*color:\s*(?:#fff(?:fff)?|white|var\(--home-white\))/gi;
    const whiteOnContextualAccent = /background:\s*var\(--accent-strong[^;]*\);[^}]*color:\s*(?:#fff(?:fff)?|white)/gi;
    const inlineWhiteOnExactAccent = /background:\s*['"]var\(--(?:accent|color-accent|home-blue)\)['"][^}]*color:\s*['"](?:#fff(?:fff)?|white)['"]/gi;
    const inlineWhiteOnContextualAccent = /background:\s*['"]var\(--accent-strong[^'"]*\)['"][^}]*color:\s*['"](?:#fff(?:fff)?|white)['"]/gi;

    for (const path of accentSurfaceFiles) {
      expect(readSource(path).match(whiteOnExactAccent), path).toBeNull();
      expect(readSource(path).match(whiteOnContextualAccent), path).toBeNull();
      expect(readSource(path).match(inlineWhiteOnExactAccent), path).toBeNull();
      expect(readSource(path).match(inlineWhiteOnContextualAccent), path).toBeNull();
    }
  });
});

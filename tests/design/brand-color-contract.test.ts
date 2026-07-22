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
  'src/app/about/about.module.css',
  'src/app/blog/blog-index.module.css',
  'src/app/courses/courses.module.css',
  'src/app/faq/faq.module.css',
  'src/app/home.module.css',
  'src/components/account/LearnerAccount.module.css',
  'src/components/blog/BlogControls.module.css',
  'src/components/bundle/BundleEnrollButton.module.css',
  'src/components/content/public-content.module.css',
  'src/components/course/CourseReviews.tsx',
  'src/components/course/EnrollButton.module.css',
  'src/components/course/LearnPageClient.tsx',
  'src/components/layout/PublicNavbar.tsx',
  'src/components/proof/proof.module.css',
  'src/components/status/StatusSurface.module.css',
  'src/components/ui/FormControls.module.css',
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
    const home = readSource('src/app/home.module.css');
    const primaryAction = home.match(/\.primaryAction\s*\{[^}]+\}/)?.[0] ?? '';

    expect(primaryAction).toContain('background: var(--home-blue);');
    expect(primaryAction).toContain('color: var(--home-on-blue);');
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

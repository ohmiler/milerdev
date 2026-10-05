import { readFileSync, readdirSync } from 'node:fs';
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
  'src/app/courses/page.tsx',
  'src/app/faq/page.tsx',
  'src/app/page.tsx',
  'src/app/dashboard/certificates/CertificateCollection.tsx',
  'src/app/dashboard/payments/PaymentHistory.tsx',
  'src/app/profile/ProfileForm.tsx',
  'src/app/profile/page.tsx',
  'src/app/settings/page.tsx',
  'src/components/account/LearnerAccountShell.tsx',
  'src/components/auth/AuthFormLayout.tsx',
  'src/components/bundle/BundleEnrollButton.tsx',
  'src/components/content/PublicContentHeader.tsx',
  'src/components/course/CourseReviews.tsx',
  'src/components/course/EnrollButton.tsx',
  'src/components/course/LearnPageClient.tsx',
  'src/components/layout/PublicNavigationBar.tsx',
  'src/components/layout/UserNavigationMenus.tsx',
  'src/components/proof/TransactionReceipt.tsx',
  'src/components/status/StatusSurface.tsx',
  'src/components/settings/PasswordSettingsForm.tsx',
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
    expect(contrastRatio('#ffffff', '#006dab')).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio('#061923', '#33bcff')).toBeGreaterThanOrEqual(4.5);
  });

  it('uses MilerDev blue for the Home primary action', () => {
    const globals = readSource('src/app/globals.css');
    const home = readSource('src/app/page.tsx');
    const button = readSource('src/components/ui/button.tsx');

    expect(home).toContain('<Link href="/courses">');
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

  it('uses a readable link blue for text and keeps the exact brand blue for fills', () => {
    const globals = readSource('src/app/globals.css');

    expect(globals).toContain('--link: #006dab;');
    expect(globals).toContain('--color-link: var(--link);');
    expect(contrastRatio('#006dab', '#ffffff')).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio('#006dab', '#f7f9fb')).toBeGreaterThanOrEqual(4.5);
    expect(globals).toContain('--link: #33bcff;');
    expect(contrastRatio('#33bcff', '#080b0f')).toBeGreaterThanOrEqual(4.5);
    // The exact brand blue is too light to be text on white; that is why text uses --link.
    expect(contrastRatio('#00abff', '#ffffff')).toBeLessThan(4.5);
  });

  it('keeps accent text on soft fills, destructive actions and links on navy readable', () => {
    const globals = readSource('src/app/globals.css');
    // First definition of a token, i.e. the light theme in :root.
    const token = (name: string) => globals.match(new RegExp(`--${name}: (#[0-9a-f]{6});`))![1];
    const tintOnWhite = (hex: string, alpha: number) => `#${hex.replace('#', '').match(/.{2}/g)!
      .map((channel) => Math.round(Number.parseInt(channel, 16) * alpha + 255 * (1 - alpha)).toString(16).padStart(2, '0'))
      .join('')}`;

    // Secondary badges and buttons and the current sidebar item: pressed blue text on the soft blue fill.
    expect(globals).toContain('--secondary-foreground: var(--color-accent-pressed);');
    expect(contrastRatio(token('color-accent-pressed'), token('color-accent-soft'))).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio('#ffffff', token('color-accent-pressed'))).toBeGreaterThanOrEqual(4.5);

    // Destructive buttons put white text on the red; destructive badges put the red on a 10% tint of itself.
    expect(globals).toContain('--destructive: var(--color-error-strong);');
    const red = token('color-error-strong');
    expect(contrastRatio('#ffffff', red)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(red, tintOnWhite(red, 0.1))).toBeGreaterThanOrEqual(4.5);

    // Links and numbers on the navy contact and sign-in panels.
    expect(contrastRatio(token('link-inverse'), token('academy-navy'))).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps text-primary for icons and graphics only; text and links use text-link', () => {
    const graphicLine = /<Star|<Check|<Lock|ImageIcon|size-16 place-items-center|bg-primary\/10 text-primary|coursePreview|star <= rating/;
    const textPrimary = /(?<![-\w])text-primary(?![-\w/])/;
    const offenders: string[] = [];

    const walk = (directory: string) => {
      for (const entry of readdirSync(resolve(process.cwd(), directory), { withFileTypes: true })) {
        const path = `${directory}/${entry.name}`;
        if (entry.isDirectory()) walk(path);
        else if (entry.name.endsWith('.tsx')) {
          readSource(path).split(/\r?\n/).forEach((line, index) => {
            if (textPrimary.test(line) && !graphicLine.test(line)) offenders.push(`${path}:${index + 1}`);
          });
        }
      }
    };
    walk('src');

    expect(offenders).toEqual([]);
  });

  it('keeps every topic hue pair readable in the light and dark themes', () => {
    const globals = readSource('src/app/globals.css');
    const darkStart = globals.indexOf('[data-theme="dark"] {');
    const pairPattern = /--hue-(\w+)-bg: (#[0-9a-f]{6}); --hue-\1-fg: (#[0-9a-f]{6});/g;
    const light = [...globals.slice(0, darkStart).matchAll(pairPattern)];
    const dark = [...globals.slice(darkStart).matchAll(pairPattern)];

    expect(light.map(([, hue]) => hue).sort()).toEqual(['amber', 'green', 'orange', 'pink', 'teal', 'violet']);
    expect(dark.map(([, hue]) => hue).sort()).toEqual(light.map(([, hue]) => hue).sort());
    for (const [, hue, background, foreground] of [...light, ...dark]) {
      expect(contrastRatio(foreground, background), hue).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('keeps discount and info badge pairs readable and off the error red', () => {
    const globals = readSource('src/app/globals.css');

    expect(globals).toContain('--discount: #c2410c;');
    expect(globals).toContain('--discount: #fdba74;');
    expect(contrastRatio('#ffffff', '#c2410c')).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio('#431407', '#fdba74')).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio('#176b93', '#eef8fd')).toBeGreaterThanOrEqual(4.5);
    expect(readSource('src/components/course/CourseCard.tsx')).toContain('<Badge variant="discount">');
    expect(readSource('src/components/bundle/BundleCard.tsx')).toContain("'discount'");
  });

  it('uses the brand navy for dark editorial sections with readable text', () => {
    const globals = readSource('src/app/globals.css');
    const proof = readSource('src/components/home/StudioProofSection.tsx');
    const home = readSource('src/app/page.tsx');

    expect(globals).toContain('--navy: #0f233a;');
    expect(globals).toContain('--color-navy: var(--navy);');
    expect(contrastRatio('#f7f9fb', '#0f233a')).toBeGreaterThanOrEqual(7);
    expect(contrastRatio('#aebbc5', '#0f233a')).toBeGreaterThanOrEqual(4.5);
    expect(proof).toContain('bg-navy py-16');
    expect(proof).not.toContain('bg-foreground');
    expect(home).toContain('rounded-2xl bg-navy px-6');
  });
});

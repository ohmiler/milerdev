import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const readSource = (path: string) => readFileSync(resolve(root, path), 'utf8');

// Admin keeps its own operations UI (ADR 0007); shared primitives are checked one by one below.
const SKIPPED_DIRECTORIES = ['src/app/admin', 'src/components/admin', 'src/components/ui'];
// A decorative, aria-hidden mock of a code editor that copies an IDE's small chrome on purpose.
const ALLOWED_FILES = ['src/components/home/HomeCodeEditor.tsx'];

function tsxFiles(directory: string): string[] {
  return readdirSync(resolve(root, directory)).flatMap((name) => {
    const path = join(directory, name).replaceAll('\\', '/');
    if (SKIPPED_DIRECTORIES.includes(path)) return [];
    if (statSync(resolve(root, path)).isDirectory()) return tsxFiles(path);
    return path.endsWith('.tsx') && !ALLOWED_FILES.includes(path) ? [path] : [];
  });
}

// Font sizes under 13px: Thai stacks vowels and tone marks, and below that they blur together.
function smallSizes(source: string): string[] {
  const found: string[] = [...(source.match(/(?<![\w-])text-xs(?![\w-])/g) ?? [])];
  for (const [match, value, unit] of source.matchAll(/(?<![\w-])text-\[(\d*\.?\d+)(rem|px)\]/g)) {
    const pixels = unit === 'rem' ? Number(value) * 16 : Number(value);
    if (pixels < 13) found.push(match);
  }
  return found;
}

describe('minimum readable text size', () => {
  it('keeps every non-admin page and component at 13px or larger', () => {
    const offenders = [...tsxFiles('src/app'), ...tsxFiles('src/components')]
      .map((path) => ({ path: relative(root, resolve(root, path)).replaceAll('\\', '/'), sizes: smallSizes(readSource(path)) }))
      .filter(({ sizes }) => sizes.length > 0)
      .map(({ path, sizes }) => `${path}: ${sizes.join(', ')}`);

    expect(offenders).toEqual([]);
  });

  it('offers text-caption (13px) as the smallest step of the type scale', () => {
    const globals = readSource('src/app/globals.css');

    expect(globals).toContain('--type-caption: 0.8125rem;');
    expect(globals).toContain('--text-caption: var(--type-caption);');
  });

  it('sizes the shared badge and menu label for Thai', () => {
    const badge = readSource('src/components/ui/badge.tsx');
    // A 24px badge leaves room for Thai marks above and below a 13px line; 20px clipped them.
    expect(badge).toContain('h-6');
    expect(badge).toContain('text-caption');
    expect(smallSizes(badge)).toEqual([]);
    expect(readSource('src/components/ui/dropdown-menu.tsx')).toContain('"px-3 py-2.5 text-caption text-muted-foreground');
  });

  it('flags the sizes it is meant to catch', () => {
    expect(smallSizes('className="text-xs text-[11px] text-[0.75rem] text-[0.8125rem] text-[13px] text-xs-foo"')).toEqual([
      'text-xs',
      'text-[11px]',
      'text-[0.75rem]',
    ]);
  });
});

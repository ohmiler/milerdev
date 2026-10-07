import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { cn, TYPE_SCALE_STEPS } from '@/lib/utils';

describe('cn and the type scale', () => {
  // A badge combined `text-caption` with its variant's text colour, and the size silently vanished.
  it('keeps a type-scale size next to a text colour', () => {
    expect(cn('text-caption', 'text-secondary-foreground')).toBe('text-caption text-secondary-foreground');
    expect(cn('text-h2 font-bold', 'text-link')).toBe('text-h2 font-bold text-link');
  });

  it('still lets a later size win over an earlier one', () => {
    expect(cn('text-caption', 'text-sm')).toBe('text-sm');
    expect(cn('text-lg', 'text-h3')).toBe('text-h3');
  });

  it('knows every step the theme defines', () => {
    const theme = readFileSync(resolve(process.cwd(), 'src/app/globals.css'), 'utf8').match(/@theme inline\s*\{[^}]+\}/)?.[0] ?? '';
    const defined = [...theme.matchAll(/--text-([a-z0-9]+): var\(--type-/g)].map((match) => match[1]);

    expect([...TYPE_SCALE_STEPS].sort()).toEqual(defined.sort());
  });
});

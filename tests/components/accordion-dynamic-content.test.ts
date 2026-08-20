import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('accordion dynamic content', () => {
  it('does not pin the inner content to the height measured when the accordion opened', () => {
    const source = readFileSync('src/components/ui/accordion.tsx', 'utf8');

    expect(source).not.toContain('h-(--radix-accordion-content-height)');
  });
});

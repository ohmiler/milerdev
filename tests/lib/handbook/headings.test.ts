import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { HANDBOOK_CHAPTERS } from '@/lib/handbook/chapters';
import { extractSections, headingId } from '@/lib/handbook/headings';

describe('handbook section ids', () => {
  it('keeps Thai vowels and tone marks, drops punctuation, and joins words with hyphens', () => {
    expect(headingId('ทำไมโจทย์ถึงสำคัญ')).toBe('ทำไมโจทย์ถึงสำคัญ');
    expect(headingId('ตัวอย่าง: จากคำขอกว้าง ๆ เป็นโจทย์ที่ตรวจได้')).toBe('ตัวอย่าง-จากคำขอกว้าง-ๆ-เป็นโจทย์ที่ตรวจได้');
    expect(headingId('  Git และ Pull Request ')).toBe('git-และ-pull-request');
  });

  it('lists only level-2 headings outside fenced code', () => {
    const source = ['# Title', '## First', 'text', '```md', '## Not a heading', '```', '### Sub', '## **Second**'].join('\n');

    expect(extractSections(source)).toEqual([
      { id: 'first', title: 'First' },
      { id: 'second', title: 'Second' },
    ]);
  });

  it('gives every written chapter distinct section ids', () => {
    for (const chapter of HANDBOOK_CHAPTERS.filter((entry) => entry.status !== 'planned')) {
      const source = readFileSync(resolve(process.cwd(), 'src/content/handbook', `${chapter.slug}.mdx`), 'utf8');
      const ids = extractSections(source).map((section) => section.id);
      expect(ids.length, chapter.slug).toBeGreaterThan(0);
      expect(new Set(ids).size, chapter.slug).toBe(ids.length);
    }
  });
});

import { existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  getChapterNeighbours,
  getReadableChapters,
  HANDBOOK_CHAPTERS,
  HANDBOOK_PARTS,
  isReadable,
  type HandbookChapter,
} from '@/lib/handbook/chapters';

const CONTENT_DIRECTORY = resolve(process.cwd(), 'src/content/handbook');

const chapter = (number: number, status: HandbookChapter['status']): HandbookChapter => ({
  number,
  slug: `chapter-${number}`,
  title: `Chapter ${number}`,
  summary: 'summary',
  part: 'foundations',
  status,
});

describe('handbook table of contents', () => {
  it('numbers the chapters 1 to n in order, with unique URL-safe slugs', () => {
    expect(HANDBOOK_CHAPTERS.map((entry) => entry.number)).toEqual(HANDBOOK_CHAPTERS.map((_, index) => index + 1));
    const slugs = HANDBOOK_CHAPTERS.map((entry) => entry.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it('keeps every part non-empty and the chapters grouped by part in reading order', () => {
    const partOrder = HANDBOOK_PARTS.map((part) => part.id);
    const partIndexes = HANDBOOK_CHAPTERS.map((entry) => partOrder.indexOf(entry.part));
    expect(partIndexes).toEqual([...partIndexes].sort((a, b) => a - b));
    for (const part of partOrder) expect(HANDBOOK_CHAPTERS.some((entry) => entry.part === part)).toBe(true);
  });

  it('has an MDX body for every drafted or published chapter, and no unregistered MDX', () => {
    const written = HANDBOOK_CHAPTERS.filter((entry) => entry.status !== 'planned').map((entry) => entry.slug);
    for (const slug of written) expect(existsSync(resolve(CONTENT_DIRECTORY, `${slug}.mdx`)), slug).toBe(true);

    const files = readdirSync(CONTENT_DIRECTORY).filter((name) => name.endsWith('.mdx')).map((name) => name.replace(/\.mdx$/, ''));
    expect(files.sort()).toEqual([...written].sort());
  });

  it('names the reviewer and the reviewed date of every published chapter', () => {
    for (const entry of HANDBOOK_CHAPTERS.filter((candidate) => candidate.status === 'published')) {
      expect(entry.reviewedBy, entry.slug).toBeTruthy();
      expect(entry.updatedAt, entry.slug).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(new Date(`${entry.updatedAt}T00:00:00Z`).getTime())).toBe(false);
    }
  });
});

describe('the review gate', () => {
  it('serves a draft on the development server only, a published chapter everywhere, and a planned one nowhere', () => {
    expect(isReadable(chapter(1, 'draft'), 'development')).toBe(true);
    expect(isReadable(chapter(1, 'draft'), 'production')).toBe(false);
    expect(isReadable(chapter(1, 'published'), 'production')).toBe(true);
    expect(isReadable(chapter(1, 'planned'), 'development')).toBe(false);
  });

  it('links previous and next to the nearest readable chapters, skipping ones still being written', () => {
    const chapters = [chapter(1, 'published'), chapter(2, 'planned'), chapter(3, 'draft'), chapter(4, 'published')];

    expect(getChapterNeighbours('chapter-1', 'production', chapters)).toEqual({ previous: undefined, next: chapters[3] });
    expect(getChapterNeighbours('chapter-4', 'production', chapters)).toEqual({ previous: chapters[0], next: undefined });
    expect(getChapterNeighbours('chapter-4', 'development', chapters).previous).toBe(chapters[2]);
    expect(getReadableChapters('production', chapters).map((entry) => entry.number)).toEqual([1, 4]);
  });
});

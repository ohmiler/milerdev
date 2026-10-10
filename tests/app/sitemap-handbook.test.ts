import { describe, expect, it, vi } from 'vitest';

// The course and bundle queries return nothing; this test is about the handbook entries.
vi.mock('@/lib/db', () => ({
  db: { select: () => ({ from: () => ({ where: () => Promise.resolve([]) }) }) },
}));
vi.mock('@/lib/error-handler', () => ({ logError: vi.fn() }));

import sitemap from '@/app/sitemap';
import { absoluteUrl } from '@/lib/content/seo';
import { chapterPath, HANDBOOK_CHAPTERS, HANDBOOK_LAUNCHED } from '@/lib/handbook/chapters';

describe('sitemap handbook entries', () => {
  it('lists the handbook and every published chapter once it is launched, and nothing unpublished', async () => {
    const urls = (await sitemap()).map((entry) => entry.url);
    const published = HANDBOOK_CHAPTERS.filter((chapter) => chapter.status === 'published');
    const unpublished = HANDBOOK_CHAPTERS.filter((chapter) => chapter.status !== 'published');

    expect(HANDBOOK_LAUNCHED).toBe(true);
    expect(urls).toContain(absoluteUrl('/handbook'));
    for (const chapter of published) expect(urls).toContain(absoluteUrl(chapterPath(chapter)));
    for (const chapter of unpublished) expect(urls).not.toContain(absoluteUrl(chapterPath(chapter)));
  });
});

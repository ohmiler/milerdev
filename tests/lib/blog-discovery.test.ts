import { describe, expect, it } from 'vitest';
import {
  buildBlogHref,
  getBlogRecoveryAction,
  readBlogDiscoveryState,
} from '@/lib/blog-discovery';

describe('Blog URL discovery', () => {
  it('reads the URL as the source of search, tag, and page state', () => {
    expect(readBlogDiscoveryState({
      search: ['  React ภาษาไทย  ', 'ignored'],
      tag: 'next-js',
      page: '3',
    })).toEqual({ search: 'React ภาษาไทย', tag: 'next-js', page: 3 });
  });

  it('normalizes missing or invalid pagination without losing active facets', () => {
    expect(readBlogDiscoveryState({ search: 'react', tag: '', page: '-8' })).toEqual({
      search: 'react',
      tag: 'all',
      page: 1,
    });
    expect(readBlogDiscoveryState({ page: 'not-a-page' }).page).toBe(1);
  });

  it('preserves search and tag while paging and resets default values', () => {
    expect(buildBlogHref({ search: 'react hooks', tag: 'typescript', page: 4 }))
      .toBe('/blog?search=react+hooks&tag=typescript&page=4');
    expect(buildBlogHref({ search: '', tag: 'all', page: 1 })).toBe('/blog');
  });

  it('recovers an out-of-range page without discarding its filters', () => {
    expect(getBlogRecoveryAction({ search: 'react', tag: 'typescript', page: 9 }, 4)).toEqual({
      href: '/blog?search=react&tag=typescript',
      label: 'กลับหน้าแรกของผลลัพธ์',
    });
    expect(getBlogRecoveryAction({ search: 'missing', tag: 'all', page: 1 }, 0)).toEqual({
      href: '/blog',
      label: 'ล้างตัวกรอง',
    });
  });
});

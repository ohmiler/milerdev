import { describe, expect, it } from 'vitest';

import nextConfig from '../../../next.config';
import { OPTIMIZED_COVER_HOSTS, resolveCoverImage } from '@/lib/courses/cover-image';

describe('resolveCoverImage', () => {
  it('resizes covers uploaded to the Bunny CDN', () => {
    expect(resolveCoverImage('https://milerdev.b-cdn.net/courses/cover.png'))
      .toEqual({ src: 'https://milerdev.b-cdn.net/courses/cover.png', optimized: true });
    // Admins can save a cover without the scheme.
    expect(resolveCoverImage('milerdev.b-cdn.net/courses/cover.png'))
      .toEqual({ src: 'https://milerdev.b-cdn.net/courses/cover.png', optimized: true });
  });

  it('shows covers from other hosts as uploaded, because the optimizer refuses them', () => {
    expect(resolveCoverImage('https://cdn.example.com/cover.webp'))
      .toEqual({ src: 'https://cdn.example.com/cover.webp', optimized: false });
    expect(resolveCoverImage('https://evilb-cdn.net/cover.png')?.optimized).toBe(false);
    expect(resolveCoverImage('http://milerdev.b-cdn.net/cover.png')?.optimized).toBe(false);
  });

  it('resizes local covers unless they carry a query string', () => {
    expect(resolveCoverImage('/images/cover.png')).toEqual({ src: '/images/cover.png', optimized: true });
    expect(resolveCoverImage('/images/cover.png?v=2')).toEqual({ src: '/images/cover.png?v=2', optimized: false });
  });

  it('treats an empty or unusable value as no cover, so the course artwork shows instead', () => {
    expect(resolveCoverImage(null)).toBeNull();
    expect(resolveCoverImage('   ')).toBeNull();
    expect(resolveCoverImage('not a url')).toBeNull();
  });

  it('only optimizes hosts that next.config.ts lets the image optimizer fetch', () => {
    const allowed = (nextConfig.images?.remotePatterns ?? [])
      .filter((pattern) => !(pattern instanceof URL) && pattern.protocol === 'https')
      .map((pattern) => (pattern as { hostname: string }).hostname);

    for (const host of OPTIMIZED_COVER_HOSTS) {
      expect(allowed).toContain(`**.${host}`);
    }
  });
});

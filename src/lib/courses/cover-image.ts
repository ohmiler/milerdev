import { normalizeImageUrl } from '@/lib/url';

// Hosts whose covers the image optimizer may fetch and resize. Each must also be allowed by
// images.remotePatterns in next.config.ts, or the optimizer refuses the request.
export const OPTIMIZED_COVER_HOSTS = ['b-cdn.net', 'bunny.net', 'googleusercontent.com'] as const;

export interface CoverImage {
  src: string;
  // False when the cover is served as uploaded: a host the optimizer may not fetch, or a local
  // path with a query string, which next/image refuses without images.localPatterns.
  optimized: boolean;
}

/** Where to load a course or bundle cover from, and whether it can be resized for the screen. */
export function resolveCoverImage(value: string | null | undefined): CoverImage | null {
  const src = normalizeImageUrl(value);
  if (!src) return null;
  if (src.startsWith('/')) return { src, optimized: !src.includes('?') };

  const { protocol, hostname } = new URL(src);
  const optimized = protocol === 'https:' && OPTIMIZED_COVER_HOSTS.some((host) => hostname.endsWith(`.${host}`));
  return { src, optimized };
}

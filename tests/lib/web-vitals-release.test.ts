import { describe, expect, it } from 'vitest';

import { getWebVitalsReleaseIdentity } from '@/lib/web-vitals-release';

describe('Web Vitals release identity', () => {
  it('prefers the release that rendered the page', () => {
    expect(getWebVitalsReleaseIdentity({
      RAILWAY_GIT_COMMIT_SHA: 'railway-release',
      VERCEL_GIT_COMMIT_SHA: 'vercel-release',
      GITHUB_SHA: 'github-release',
    })).toBe('railway-release');
  });

  it('falls back safely instead of breaking page rendering', () => {
    expect(getWebVitalsReleaseIdentity({
      RAILWAY_GIT_COMMIT_SHA: 'invalid release identity',
      VERCEL_GIT_COMMIT_SHA: undefined,
      GITHUB_SHA: undefined,
    })).toBe('unknown-release');
  });
});

import 'server-only';

import {
  WEB_VITAL_RELEASE_IDENTITY_MAX_LENGTH,
  WEB_VITAL_RELEASE_IDENTITY_PATTERN,
} from '@/lib/web-vitals-contract';

type ReleaseEnvironment = Partial<Record<
  'RAILWAY_GIT_COMMIT_SHA' | 'VERCEL_GIT_COMMIT_SHA' | 'GITHUB_SHA',
  string
>>;

export function getWebVitalsReleaseIdentity(
  environment: ReleaseEnvironment = process.env as ReleaseEnvironment,
): string {
  const candidate = (
    environment.RAILWAY_GIT_COMMIT_SHA
      ?? environment.VERCEL_GIT_COMMIT_SHA
      ?? environment.GITHUB_SHA
      ?? 'local-development'
  ).trim();

  if (
    candidate.length > 0
    && candidate.length <= WEB_VITAL_RELEASE_IDENTITY_MAX_LENGTH
    && WEB_VITAL_RELEASE_IDENTITY_PATTERN.test(candidate)
  ) return candidate;

  return 'unknown-release';
}

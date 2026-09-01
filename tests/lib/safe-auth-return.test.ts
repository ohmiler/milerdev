import { describe, expect, it } from 'vitest';

import {
  createAuthReturnHref,
  resolveSafeAuthRedirect,
  resolveSafeAuthReturn,
} from '@/lib/safe-auth-return';

describe('SafeReturnIntent', () => {
  it('preserves a single-slash internal pathname', () => {
    expect(resolveSafeAuthReturn('/courses/typescript-foundations')).toEqual({
      pathname: '/courses/typescript-foundations',
      source: 'validated',
    });
  });

  it('keeps only the pathname and drops query or hash state', () => {
    expect(resolveSafeAuthReturn('/courses/typescript?coupon=secret#curriculum')).toEqual({
      pathname: '/courses/typescript',
      source: 'validated',
    });
  });

  it.each(['/courses/node.js', '/bundles/fullstack.v2'])(
    'preserves a dotted product slug %s',
    (destination) => {
      expect(resolveSafeAuthReturn(destination)).toEqual({
        pathname: destination,
        source: 'validated',
      });
    },
  );

  it.each([
    undefined,
    ['/courses/typescript-foundations'],
    'https://evil.example/course',
    '//evil.example/course',
    '/\\evil.example/course',
    '/courses/typescript\u0000foundations',
    '/courses/typescript\u0085foundations',
    '/courses/typescript%C2%85foundations',
    '%2F%2Fevil.example/course',
    '/%2F%2Fevil.example/course',
    '%252F%252Fevil.example/course',
    '%2Fapi%2Fpayments',
    '/api/payments',
    '/API/payments',
    '/_next/static/chunk.js',
    '/__nextjs_source-map',
    '/favicon.ico',
    '/manifest.webmanifest',
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password/token',
    '/courses/%2e%2e/login',
    '/courses/../login',
  ])('falls back for unsafe destination %j', (destination) => {
    expect(resolveSafeAuthReturn(destination)).toEqual({
      pathname: '/dashboard',
      source: 'fallback',
    });
  });

  it('revalidates values when carrying the intent to another auth entry page', () => {
    expect(createAuthReturnHref('/register', '//evil.example/course')).toBe(
      '/register?callbackUrl=%2Fdashboard',
    );
  });

  it('revalidates Auth.js redirects and returns an absolute same-origin URL', () => {
    const baseUrl = 'https://milerdev.tech';

    expect(resolveSafeAuthRedirect('/courses/typescript?coupon=secret', baseUrl)).toBe(
      'https://milerdev.tech/courses/typescript',
    );
    expect(resolveSafeAuthRedirect('https://milerdev.tech/bundles/full-stack#buy', baseUrl)).toBe(
      'https://milerdev.tech/bundles/full-stack',
    );
    expect(resolveSafeAuthRedirect('https://evil.example/courses/typescript', baseUrl)).toBe(
      'https://milerdev.tech/dashboard',
    );
    expect(resolveSafeAuthRedirect('https://milerdev.tech/api/payments', baseUrl)).toBe(
      'https://milerdev.tech/dashboard',
    );
    expect(resolveSafeAuthRedirect('https://milerdev.tech/courses\\typescript', baseUrl)).toBe(
      'https://milerdev.tech/dashboard',
    );
    expect(resolveSafeAuthRedirect('https://milerdev.tech/courses\ttypescript', baseUrl)).toBe(
      'https://milerdev.tech/dashboard',
    );
  });
});

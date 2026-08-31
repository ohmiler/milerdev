import { describe, expect, it } from 'vitest';

import {
  classifyRequiredE2ERequest,
  requiredE2EProviderForUrl,
} from '../../e2e/required/provider-mock-adapter.mjs';

const APP_BASE_URL = 'http://127.0.0.1:3100';

describe('required E2E browser network policy', () => {
  it.each([
    'http://127.0.0.1:3100/courses',
    'http://127.0.0.1:3100/api/auth/session',
    'data:image/svg+xml;base64,PHN2Zz4=',
    'blob:http://127.0.0.1:3100/local-preview',
  ])('allows local browser traffic: %s', (requestUrl) => {
    expect(classifyRequiredE2ERequest(requestUrl, APP_BASE_URL)).toBe('allow');
  });

  it.each([
    ['stripe', 'https://api.stripe.com/v1/checkout/sessions'],
    ['slipok', 'https://api.slipok.com/api/line/apikey/123'],
    ['bunny', 'https://video.bunnycdn.com/library/123/videos/456'],
    ['google', 'https://accounts.google.com/o/oauth2/v2/auth'],
    ['resend', 'https://api.resend.com/emails'],
    ['smtp', 'smtp://mail.example.com:587'],
  ])('mocks %s provider traffic: %s', (provider, requestUrl) => {
    expect(classifyRequiredE2ERequest(requestUrl, APP_BASE_URL)).toBe('mock-provider');
    expect(requiredE2EProviderForUrl(requestUrl)).toBe(provider);
  });

  it('blocks unknown external traffic', () => {
    const requestUrl = 'https://unknown-external.example/resource';

    expect(classifyRequiredE2ERequest(requestUrl, APP_BASE_URL)).toBe('block');
    expect(requiredE2EProviderForUrl(requestUrl)).toBeNull();
  });
});

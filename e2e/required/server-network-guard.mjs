import { installRequiredE2EServerProviderMocks } from './provider-mock-adapter.mjs';

installRequiredE2EServerProviderMocks();

// Deliver only the explicitly configured test Resend traffic to the loopback
// mailbox owned by the Playwright worker. Other providers keep their mocks.
const guardedFetch = globalThis.fetch;
globalThis.fetch = function emailMockFetch(input, init) {
  const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
  if (process.env.RESEND_API_KEY === 're_required_email_verification_placeholder'
      && url.origin === 'https://api.resend.com' && url.pathname === '/emails') {
    return guardedFetch('http://127.0.0.1:4318/emails', init);
  }
  return guardedFetch(input, init);
};

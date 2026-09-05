import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { describe, expect, it } from 'vitest';

const guardUrl = pathToFileURL(
  path.resolve('e2e/required/server-network-guard.mjs'),
).href;

function runWithRequiredE2EGuard(source: string) {
  return spawnSync(process.execPath, ['--input-type=module', '-e', source], {
    encoding: 'utf8',
    env: {
      ...process.env,
      NODE_OPTIONS: `--import=${guardUrl}`,
    },
  });
}

describe('required E2E provider mock adapter', () => {
  it('returns a deterministic Stripe failure without contacting Stripe', () => {
    const result = runWithRequiredE2EGuard(`
      const response = await fetch('https://api.stripe.com/v1/checkout/sessions');
      console.log(JSON.stringify({
        status: response.status,
        provider: response.headers.get('x-e2e-provider-mock'),
        body: await response.json(),
      }));
    `);

    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout.trim())).toEqual({
      status: 503,
      provider: 'stripe',
      body: {
        error: 'required_e2e_provider_unavailable',
        provider: 'stripe',
      },
    });
  });

  it('returns the same deterministic contract through node:https', () => {
    const result = runWithRequiredE2EGuard(`
      import https from 'node:https';

      const output = await new Promise((resolve, reject) => {
        https.get('https://api.resend.com/emails', (response) => {
          let body = '';
          response.setEncoding('utf8');
          response.on('data', (chunk) => { body += chunk; });
          response.on('end', () => resolve({
            status: response.statusCode,
            provider: response.headers['x-e2e-provider-mock'],
            body: JSON.parse(body),
          }));
        }).on('error', reject);
      });

      console.log(JSON.stringify(output));
    `);

    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout.trim())).toEqual({
      status: 503,
      provider: 'resend',
      body: {
        error: 'required_e2e_provider_unavailable',
        provider: 'resend',
      },
    });
  });

  it('supplies an exact paid Stripe session through the real SDK without external traffic', () => {
    const result = runWithRequiredE2EGuard(`
      import Stripe from 'stripe';
      const data = { u: 'test-owner', p: 'test-payment', t: 'course', i: 'test-course', a: 49025 };
      const id = 'cs_e2e_' + Buffer.from(JSON.stringify(data)).toString('base64url');
      const stripe = new Stripe('sk_test_required_e2e_placeholder', { maxNetworkRetries: 0 });
      const session = await stripe.checkout.sessions.retrieve(id);
      console.log(JSON.stringify({ paymentId: session.metadata.paymentId, amount: session.amount_total, state: session.payment_status }));
    `);
    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout.trim())).toEqual({ paymentId: 'test-payment', amount: 49025, state: 'paid' });
  });

  it('returns a deterministic SMTP error without opening an external socket', () => {
    const result = runWithRequiredE2EGuard(
      "const net = await import('node:net'); net.default.connect(587, 'smtp.example.com')",
    );

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Required E2E SMTP provider mock is unavailable');
    expect(result.stderr).toContain("code: 'E2E_PROVIDER_MOCK_UNAVAILABLE'");
  });

  it('still rejects unknown external destinations', () => {
    const result = runWithRequiredE2EGuard(
      "await fetch('https://unknown-external.example/resource')",
    );

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Required E2E blocked external network request');
  });
});

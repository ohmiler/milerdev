// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import PaymentHistory from '@/app/dashboard/payments/PaymentHistory';

describe('payment history', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('totals completed THB payments without losing satang precision', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        payments: [
          {
            id: 'payment-1',
            amount: '900719925474099.91',
            currency: 'THB',
            method: 'promptpay',
            status: 'completed',
            createdAt: '2026-08-30T00:00:00.000Z',
            courseId: 'course-1',
            courseTitle: 'TypeScript',
            courseSlug: 'typescript',
            bundleId: null,
            bundleTitle: null,
            bundleSlug: null,
          },
          {
            id: 'payment-2',
            amount: '0.01',
            currency: 'THB',
            method: 'stripe',
            status: 'completed',
            createdAt: '2026-08-30T00:00:00.000Z',
            courseId: null,
            courseTitle: null,
            courseSlug: null,
            bundleId: 'bundle-1',
            bundleTitle: 'Full stack',
            bundleSlug: 'full-stack',
          },
        ],
      }),
    }));

    render(<PaymentHistory />);

    expect(await screen.findByText('฿900,719,925,474,099.92')).toBeTruthy();
  });
});

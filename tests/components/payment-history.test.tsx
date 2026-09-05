// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { paymentRecord } from '../fixtures/payment-record';
import PaymentHistory from '@/app/dashboard/payments/PaymentHistory';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

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
          paymentRecord({ id: 'payment-1', amount: '900719925474099.91', status: 'completed' }),
          paymentRecord({ id: 'payment-2', amount: '0.01', status: 'completed' }),
        ],
      }),
    }));

    render(<PaymentHistory />);

    expect(await screen.findByText('฿900,719,925,474,099.92')).toBeTruthy();
  });
});

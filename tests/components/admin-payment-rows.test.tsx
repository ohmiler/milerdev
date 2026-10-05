// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import AdminPaymentsPage from '@/app/admin/payments/page';

type Row = { id: string; method: 'stripe' | 'promptpay' | 'bank_transfer'; status: 'pending' | 'completed' | 'failed' | 'refunded' | 'verifying' };

function makePayment({ id, method, status }: Row) {
  return {
    id,
    amount: '990.00',
    currency: 'THB',
    method,
    status,
    stripePaymentId: null,
    slipUrl: null,
    createdAt: '2026-09-01T00:00:00.000Z',
    userId: `user-${id}`,
    courseId: 'course-1',
    bundleId: null,
    userName: `ผู้ซื้อ ${id}`,
    userEmail: `${id}@example.com`,
    courseTitle: `คอร์สของ ${id}`,
    bundleTitle: null,
    itemTitle: null,
  };
}

function renderRows(rows: Row[]) {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
    payments: rows.map(makePayment),
    stats: { total: rows.length, pending: 0, completed: 0, failed: 0, refunded: 0, totalRevenue: 0 },
    pagination: { page: 1, limit: 20, total: rows.length, totalPages: 1 },
  }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
  render(<AdminPaymentsPage />);
}

async function rowFor(id: string) {
  const title = await screen.findByText(`คอร์สของ ${id}`);
  return within(title.closest('tr') as HTMLElement);
}

function optionLabels(row: ReturnType<typeof within>, id: string) {
  const select = row.getByRole('combobox', { name: `เปลี่ยนสถานะธุรกรรม ${id}` }) as HTMLSelectElement;
  return Array.from(select.options).map((option) => option.textContent);
}

describe('Admin payment rows', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('offers a status change only where one is possible', async () => {
    renderRows([
      { id: 'pay-refunded', method: 'promptpay', status: 'refunded' },
      { id: 'pay-stripe-failed', method: 'stripe', status: 'failed' },
      { id: 'pay-completed', method: 'promptpay', status: 'completed' },
      { id: 'pay-stripe-pending', method: 'stripe', status: 'pending' },
      { id: 'pay-verifying', method: 'promptpay', status: 'verifying' },
    ]);

    for (const id of ['pay-refunded', 'pay-stripe-failed']) {
      expect((await rowFor(id)).queryByRole('combobox')).toBeNull();
    }
    expect(optionLabels(await rowFor('pay-completed'), 'pay-completed')).toEqual(['เปลี่ยนสถานะ', 'คืนเงิน']);
    // Stripe payments are confirmed by Stripe, never marked paid by hand.
    expect(optionLabels(await rowFor('pay-stripe-pending'), 'pay-stripe-pending')).toEqual(['เปลี่ยนสถานะ', 'ล้มเหลว']);
    expect(optionLabels(await rowFor('pay-verifying'), 'pay-verifying')).toEqual(['เปลี่ยนสถานะ', 'สำเร็จ', 'ล้มเหลว']);
  });

  it('links open PromptPay cases to their place in the reconciliation queue', async () => {
    renderRows([
      { id: 'pay-verifying', method: 'promptpay', status: 'verifying' },
      { id: 'pay-failed', method: 'promptpay', status: 'failed' },
      { id: 'pay-completed', method: 'promptpay', status: 'completed' },
      { id: 'pay-stripe-pending', method: 'stripe', status: 'pending' },
    ]);

    const link = (await rowFor('pay-verifying')).getByRole('link', { name: 'เปิดในคิวกระทบยอด' });
    expect(link.getAttribute('href')).toBe('/admin/reconciliation?status=verifying&q=pay-verifying');
    expect((await rowFor('pay-failed')).getByRole('link', { name: 'เปิดในคิวกระทบยอด' }).getAttribute('href'))
      .toBe('/admin/reconciliation?status=failed&q=pay-failed');
    for (const id of ['pay-completed', 'pay-stripe-pending']) {
      expect((await rowFor(id)).queryByRole('link', { name: 'เปิดในคิวกระทบยอด' })).toBeNull();
    }
  });
});

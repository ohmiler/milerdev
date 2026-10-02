import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  limit: vi.fn(),
  write: vi.fn(),
  selectResults: [] as unknown[][],
}));

vi.mock('@/lib/auth', () => ({ auth: mocks.auth }));
vi.mock('@/lib/db', () => {
  // Each select() resolves to the next queued result; any write is recorded so tests can prove there is none.
  const select = () => {
    const chain: Record<string, unknown> = {};
    for (const method of ['from', 'leftJoin', 'innerJoin', 'where', 'orderBy']) chain[method] = () => chain;
    chain.limit = (value: number) => { mocks.limit(value); return chain; };
    chain.then = (resolve: (rows: unknown[]) => unknown) => resolve(mocks.selectResults.shift() ?? []);
    return chain;
  };
  const write = () => { mocks.write(); throw new Error('read-only route must not write'); };
  return { db: { select, insert: write, update: write, delete: write, transaction: write } };
});

import { GET } from '@/app/api/admin/reconciliation/[paymentId]/route';

const admin = { user: { id: 'admin-a', role: 'admin' }, expires: '2099-01-01T00:00:00.000Z' };

const basePayment = {
  id: 'pay-1',
  userId: 'user-1',
  courseId: 'course-1',
  bundleId: null,
  amount: '990.00',
  currency: 'THB',
  method: 'promptpay',
  status: 'verifying',
  itemTitle: 'TypeScript',
  promptpayTransRef: null,
  retryCount: 0,
  lastRetryAt: null,
  createdAt: new Date('2026-09-01T00:00:00.000Z'),
  payerName: 'Buyer',
  payerEmail: 'buyer@example.com',
};

function get(paymentId = 'pay-1') {
  return GET(new Request('http://localhost/api/admin/reconciliation/x'), { params: Promise.resolve({ paymentId }) });
}

describe('GET /api/admin/reconciliation/[paymentId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.selectResults.length = 0;
    mocks.auth.mockResolvedValue(admin);
  });

  it('rejects anyone who is not an admin before reading any data', async () => {
    mocks.auth.mockResolvedValue({ user: { id: 'u1', role: 'student' } });
    expect((await get()).status).toBe(401);

    mocks.auth.mockResolvedValue(null);
    expect((await get()).status).toBe(401);
    expect(mocks.limit).not.toHaveBeenCalled();
  });

  it('answers 404 for an unknown payment', async () => {
    mocks.selectResults.push([]);

    expect((await get('missing')).status).toBe(404);
  });

  it('returns the payer, amount and an open decision for a verifying PromptPay payment', async () => {
    mocks.selectResults.push([basePayment], [{ enrolled: 0 }], []);

    const response = await get();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.payer).toEqual({ name: 'Buyer', email: 'buyer@example.com' });
    expect(body.payment).toMatchObject({
      id: 'pay-1',
      status: 'verifying',
      amount: '990.00',
      currency: 'THB',
      itemTitle: 'TypeScript',
      itemType: 'course',
      transactionReference: null,
      retryCount: 0,
    });
    expect(body.entitlement).toEqual({ kind: 'course', total: 1, enrolled: 0 });
    expect(body.history).toEqual([]);
    expect(body.decision).toEqual({ canDecide: true, maxRetries: 5 });
    expect(mocks.write).not.toHaveBeenCalled();
  });

  it('reports an existing enrollment for a course payment', async () => {
    mocks.selectResults.push([basePayment], [{ enrolled: 1 }], []);

    expect((await (await get()).json()).entitlement).toEqual({ kind: 'course', total: 1, enrolled: 1 });
  });

  it('counts enrolled courses against the bundle size', async () => {
    mocks.selectResults.push(
      [{ ...basePayment, courseId: null, bundleId: 'bundle-1', itemTitle: 'Bundle' }],
      [{ total: 4 }],
      [{ enrolled: 3 }],
      [],
    );

    const body = await (await get()).json();

    expect(body.payment.itemType).toBe('bundle');
    expect(body.entitlement).toEqual({ kind: 'bundle', total: 4, enrolled: 3 });
  });

  it('marks entitlement unknown when the payer or item link is gone', async () => {
    mocks.selectResults.push([{ ...basePayment, userId: null, payerName: null, payerEmail: null }], []);

    const body = await (await get()).json();

    expect(body.payer).toBeNull();
    expect(body.entitlement).toEqual({ kind: 'unknown' });
  });

  it('exposes the bank reference only when one was recorded', async () => {
    mocks.selectResults.push([{ ...basePayment, status: 'failed', promptpayTransRef: 'REF123' }], [{ enrolled: 0 }], []);

    expect((await (await get()).json()).payment.transactionReference).toBe('REF123');
  });

  it.each([
    ['completed payment', { status: 'completed' }],
    ['refunded payment', { status: 'refunded' }],
    ['pending payment', { status: 'pending' }],
    ['non-PromptPay payment', { method: 'stripe' }],
    ['payment with all retries used', { retryCount: 5 }],
  ])('does not allow a decision for a %s', async (_label, override) => {
    mocks.selectResults.push([{ ...basePayment, ...override }], [{ enrolled: 0 }], []);

    expect((await (await get()).json()).decision.canDecide).toBe(false);
  });

  it('returns the review history without network details', async () => {
    const entry = {
      id: 'log-1',
      action: 'update',
      oldValue: 'status: verifying',
      newValue: 'status: failed; reconciliation rejected; reason: no match',
      createdAt: new Date('2026-09-02T00:00:00.000Z'),
      actorName: 'Admin',
      ipAddress: '203.0.113.9',
      userAgent: 'Mozilla',
    };
    mocks.selectResults.push([basePayment], [{ enrolled: 0 }], [entry]);

    const body = await (await get()).json();

    expect(body.history).toHaveLength(1);
    expect(body.history[0].newValue).toContain('reason: no match');
    expect(JSON.stringify(body)).not.toContain('203.0.113.9');
    // history is bounded: payment lookup limit 1, audit limit 10
    expect(mocks.limit).toHaveBeenCalledWith(10);
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  selectResults: [] as unknown[],
  transactionSelectResults: [] as unknown[][],
  transactionAffectedRows: 1,
}));

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  requireAdmin: vi.fn(),
  dbUpdate: vi.fn(),
  dbDelete: vi.fn(),
  transactionDelete: vi.fn(),
  transaction: vi.fn(),
  logAudit: vi.fn(),
}));

function selectChain() {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockImplementation(() => Promise.resolve(state.selectResults)),
      }),
      innerJoin: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(state.selectResults),
      }),
    }),
  };
}

function transactionSelectChain() {
  const results = state.transactionSelectResults.shift() ?? state.selectResults;
  const whereResult = Promise.resolve(results);
  (whereResult as unknown as { limit: ReturnType<typeof vi.fn> }).limit = vi.fn().mockResolvedValue(results);
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue(whereResult),
      innerJoin: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(results),
      }),
    }),
  };
}

vi.mock('@/lib/auth', () => ({ auth: mocks.auth }));
vi.mock('@/lib/auth-helpers', () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock('@/lib/auditLog', () => ({ logAudit: mocks.logAudit }));
vi.mock('@/lib/notify', () => ({ notify: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/lib/email', () => ({
  sendEnrollmentEmail: vi.fn().mockResolvedValue(undefined),
  sendPaymentConfirmation: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@paralleldrive/cuid2', () => ({ createId: vi.fn(() => 'test-id') }));

vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn(() => selectChain()),
    update: mocks.dbUpdate.mockReturnValue({
      set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([{ affectedRows: 1 }]) }),
    }),
    delete: mocks.dbDelete.mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
    insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) }),
    query: {
      enrollments: { findFirst: vi.fn().mockResolvedValue({ id: 'existing-enrollment' }) },
    },
    transaction: mocks.transaction.mockImplementation(async (callback) => callback({
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockImplementation(() => Promise.resolve([{ affectedRows: state.transactionAffectedRows }])),
        }),
      }),
      insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) }),
      delete: mocks.transactionDelete.mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
      select: vi.fn(() => transactionSelectChain()),
      query: {
        enrollments: { findFirst: vi.fn().mockResolvedValue({ id: 'existing-enrollment' }) },
      },
    })),
  },
}));

const adminSession = {
  user: { id: 'admin-1', role: 'admin', name: 'Admin', email: 'admin@example.com' },
  expires: new Date(Date.now() + 86_400_000).toISOString(),
};

const promptPayPayment = {
  id: 'pay-1',
  userId: 'user-1',
  courseId: 'course-1',
  bundleId: null,
  amount: '990.00',
  currency: 'THB',
  method: 'promptpay',
  status: 'verifying',
  retryCount: 0,
};

describe('admin payment mutation boundaries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.selectResults = [promptPayPayment];
    state.transactionSelectResults = [];
    state.transactionAffectedRows = 1;
    mocks.auth.mockResolvedValue(adminSession);
    mocks.requireAdmin.mockResolvedValue({ session: adminSession });
  });

  it('does not default an empty reconciliation request to approval', async () => {
    const route = await import('@/app/api/admin/reconciliation/[paymentId]/retry/route');
    const request = new Request('http://localhost/api/admin/reconciliation/pay-1/retry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });

    const response = await route.POST(request, { params: Promise.resolve({ paymentId: 'pay-1' }) });

    expect(response.status).toBe(400);
    expect(mocks.dbUpdate).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it('approves PromptPay only with an explicit reason and transactional entitlement', async () => {
    const route = await import('@/app/api/admin/reconciliation/[paymentId]/retry/route');
    const request = new Request('http://localhost/api/admin/reconciliation/pay-1/retry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve', reason: 'verified against bank evidence' }),
    });

    const response = await route.POST(request, { params: Promise.resolve({ paymentId: 'pay-1' }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe('completed');
    expect(body.enrolled).toBe(1);
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
  });

  it('records an explicit PromptPay rejection in the mutation transaction', async () => {
    const route = await import('@/app/api/admin/reconciliation/[paymentId]/retry/route');
    const request = new Request('http://localhost/api/admin/reconciliation/pay-1/retry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reject', reason: 'bank reference did not match' }),
    });

    const response = await route.POST(request, { params: Promise.resolve({ paymentId: 'pay-1' }) });

    expect(response.status).toBe(200);
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
  });

  it('requires a reason for bulk reconciliation mutations', async () => {
    const route = await import('@/app/api/admin/reconciliation/route');
    const request = new Request('http://localhost/api/admin/reconciliation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'mark_failed', paymentIds: ['pay-1'] }),
    });

    const response = await route.POST(request);

    expect(response.status).toBe(400);
    expect(mocks.dbUpdate).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it('writes bulk reconciliation status and audit in one transaction', async () => {
    const route = await import('@/app/api/admin/reconciliation/route');
    const request = new Request('http://localhost/api/admin/reconciliation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'mark_failed',
        paymentIds: ['pay-1'],
        reason: 'batch review found no matching evidence',
      }),
    });

    const response = await route.POST(request);

    expect(response.status).toBe(200);
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.dbUpdate).not.toHaveBeenCalled();
  });

  it('does not allow hard deletion of an individual payment record', async () => {
    const route = await import('@/app/api/admin/payments/[id]/route');
    const request = new Request('http://localhost/api/admin/payments/pay-1', { method: 'DELETE' });

    const response = await route.DELETE(request, { params: Promise.resolve({ id: 'pay-1' }) });

    expect(response.status).toBe(405);
    expect(mocks.dbDelete).not.toHaveBeenCalled();
  });

  it('does not allow an admin to manually complete a Stripe payment', async () => {
    state.selectResults = [{ ...promptPayPayment, method: 'stripe', status: 'pending' }];
    const route = await import('@/app/api/admin/payments/[id]/route');
    const request = new Request('http://localhost/api/admin/payments/pay-1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed', reason: 'manual override attempt' }),
    });

    const response = await route.PUT(request, { params: Promise.resolve({ id: 'pay-1' }) });

    expect(response.status).toBe(400);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it('treats refunded payments as terminal during manual completion', async () => {
    state.selectResults = [{ ...promptPayPayment, status: 'refunded' }];
    const route = await import('@/app/api/admin/payments/[id]/route');
    const request = new Request('http://localhost/api/admin/payments/pay-1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed', reason: 'attempted reactivation' }),
    });

    const response = await route.PUT(request, { params: Promise.resolve({ id: 'pay-1' }) });

    expect(response.status).toBe(400);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it('preserves enrollment when another completed payment still grants access', async () => {
    state.selectResults = [{ ...promptPayPayment, status: 'completed' }];
    state.transactionSelectResults = [[{ count: 1 }], [{ count: 0 }]];
    const route = await import('@/app/api/admin/payments/[id]/route');
    const request = new Request('http://localhost/api/admin/payments/pay-1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'refunded', reason: 'customer refund confirmed' }),
    });

    const response = await route.PUT(request, { params: Promise.resolve({ id: 'pay-1' }) });

    expect(response.status).toBe(200);
    expect(mocks.transactionDelete).not.toHaveBeenCalled();
  });

  it('revokes enrollment on refund when no other payment grants access', async () => {
    state.selectResults = [{ ...promptPayPayment, status: 'completed' }];
    state.transactionSelectResults = [[{ count: 0 }], [{ count: 0 }]];
    const route = await import('@/app/api/admin/payments/[id]/route');
    const request = new Request('http://localhost/api/admin/payments/pay-1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'refunded', reason: 'customer refund confirmed' }),
    });

    const response = await route.PUT(request, { params: Promise.resolve({ id: 'pay-1' }) });

    expect(response.status).toBe(200);
    expect(mocks.transactionDelete).toHaveBeenCalledTimes(1);
  });

  it('does not revoke entitlement when the refund transition loses a race', async () => {
    state.selectResults = [{ ...promptPayPayment, status: 'completed' }];
    state.transactionAffectedRows = 0;
    const route = await import('@/app/api/admin/payments/[id]/route');
    const request = new Request('http://localhost/api/admin/payments/pay-1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'refunded', reason: 'customer refund confirmed' }),
    });

    const response = await route.PUT(request, { params: Promise.resolve({ id: 'pay-1' }) });

    expect(response.status).toBe(409);
    expect(mocks.transactionDelete).not.toHaveBeenCalled();
  });

  it('does not hard-delete stale pending attempts during cleanup', async () => {
    const route = await import('@/app/api/admin/payments/cleanup/route');
    const response = await route.DELETE(new Request('http://localhost/api/admin/payments/cleanup', {
      method: 'DELETE',
    }));

    expect(response.status).toBe(405);
    expect(mocks.dbDelete).not.toHaveBeenCalled();
  });
});

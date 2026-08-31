import { beforeEach, describe, expect, it, vi } from 'vitest';

const { dbTransaction, insertedRows, paymentState, projectPurchase } = vi.hoisted(() => ({
  dbTransaction: vi.fn(),
  insertedRows: [] as Array<Record<string, unknown>>,
  paymentState: { status: 'verifying' as 'verifying' | 'completed' },
  projectPurchase: vi.fn(),
}));

vi.mock('@/lib/db/safe-insert', () => ({
  isDuplicateKeyError: vi.fn().mockReturnValue(false),
}));
vi.mock('@/lib/db', () => ({ db: { transaction: dbTransaction } }));
vi.mock('@/lib/purchase-measurement-projector', () => ({
  purchaseMeasurementProjector: { projectPurchase },
}));

import { fulfillManualPayment } from '@/lib/payment-fulfillment';

const payment = () => ({
  id: 'payment-1',
  userId: 'student-1',
  courseId: 'course-1',
  bundleId: null,
  couponId: null,
  attributedExposureId: null,
  amount: '990.00',
  currency: 'THB',
  method: 'promptpay',
  stripePaymentId: null,
  slipUrl: null,
  promptpayTransRef: null,
  itemTitle: 'Course One',
  status: paymentState.status,
  retryCount: 0,
  lastRetryAt: null,
  createdAt: new Date('2026-08-31T09:00:00.000Z'),
});

function transactionAdapter() {
  return {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([payment()]) })),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({ where: vi.fn().mockResolvedValue([{ affectedRows: 1 }]) })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(async (row: Record<string, unknown>) => {
        insertedRows.push(row);
      }),
    })),
  };
}

describe('audited manual purchase outbox', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertedRows.length = 0;
    paymentState.status = 'verifying';
    projectPurchase.mockResolvedValue({ status: 'projected' });
    dbTransaction.mockImplementation(async (work) => work(transactionAdapter()));
  });

  it('audits and enqueues only the first authorized completion before projecting it', async () => {
    const result = await fulfillManualPayment({
      paymentId: 'payment-1',
      allowedMethod: 'promptpay',
      actorId: 'admin-1',
      reason: 'ตรวจสอบหลักฐานกับธนาคารแล้ว',
    });

    expect(result.status).toBe('fulfilled');
    expect(insertedRows).toContainEqual(expect.objectContaining({
      userId: 'admin-1',
      entityType: 'payment',
      entityId: 'payment-1',
    }));
    expect(insertedRows).toContainEqual(expect.objectContaining({
      eventName: 'purchase_completed',
      paymentId: 'payment-1',
    }));
    expect(projectPurchase).toHaveBeenCalledWith('payment-1');
  });

  it('uses an already-completed retry only to reconcile the original fact', async () => {
    paymentState.status = 'completed';

    const result = await fulfillManualPayment({
      paymentId: 'payment-1',
      allowedMethod: 'promptpay',
      actorId: 'admin-1',
      reason: 'ตรวจสอบซ้ำตามคำขอผู้เรียน',
    });

    expect(result.status).toBe('already_fulfilled');
    expect(insertedRows).toHaveLength(0);
    expect(projectPurchase).toHaveBeenCalledWith('payment-1');
  });

  it('does not reverse audited completion when projection is unavailable after commit', async () => {
    projectPurchase.mockResolvedValue({ status: 'failed' });

    const result = await fulfillManualPayment({
      paymentId: 'payment-1',
      allowedMethod: 'promptpay',
      actorId: 'admin-1',
      reason: 'ตรวจสอบหลักฐานกับธนาคารแล้ว',
    });

    expect(result.status).toBe('fulfilled');
    expect(insertedRows).toContainEqual(expect.objectContaining({
      eventName: 'purchase_completed',
      paymentId: 'payment-1',
    }));
  });

  it('rejects missing audit context before touching payment authority or measurement', async () => {
    const result = await fulfillManualPayment({
      paymentId: 'payment-1',
      actorId: '',
      reason: 'no',
    });

    expect(result).toEqual({
      status: 'rejected', code: 'INVALID_AUDIT_CONTEXT', retryable: false,
    });
    expect(dbTransaction).not.toHaveBeenCalled();
    expect(projectPurchase).not.toHaveBeenCalled();
  });
});

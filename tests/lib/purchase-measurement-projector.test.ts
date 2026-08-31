import { describe, expect, it, vi } from 'vitest';

import {
  createPurchaseMeasurementProjector,
  type PurchaseMeasurementStore,
  type PurchaseProjection,
} from '@/lib/purchase-measurement-projector';

class MemoryPurchaseMeasurementStore implements PurchaseMeasurementStore {
  payment: PurchaseProjection | null = {
    paymentId: 'pay-1',
    userId: 'user-1',
    courseId: 'course-1',
    bundleId: null,
    method: 'stripe',
    status: 'completed',
    amount: '990.00',
    attributedExposureId: '11111111-1111-4111-8111-111111111111',
  };
  outbox = new Map<string, { id: string; paymentId: string; createdAt: Date; projected: boolean }>();
  facts = new Set<string>();
  failures = 0;
  failProjection = false;

  async readCompletedPayment(paymentId: string) {
    return this.payment?.paymentId === paymentId ? this.payment : null;
  }

  async ensurePurchaseOutbox(paymentId: string) {
    if (this.outbox.has(paymentId)) return;
    this.outbox.set(paymentId, {
      id: `outbox:${paymentId}`,
      paymentId,
      createdAt: new Date('2026-08-31T08:00:00.000Z'),
      projected: false,
    });
  }

  async projectPendingPurchase(payment: PurchaseProjection) {
    if (this.failProjection) throw new Error('projector unavailable');
    const outbox = this.outbox.get(payment.paymentId);
    if (!outbox || outbox.projected) return 'already_projected' as const;
    const duplicate = this.facts.has(payment.paymentId);
    this.facts.add(payment.paymentId);
    outbox.projected = true;
    return duplicate ? 'duplicate' as const : 'projected' as const;
  }

  async recordProjectionFailure() {
    this.failures += 1;
  }
}

describe('purchase measurement projector', () => {
  it('does not inspect or mutate payment data while purchase measurement is disabled', async () => {
    const store = new MemoryPurchaseMeasurementStore();
    const readPayment = vi.spyOn(store, 'readCompletedPayment');
    const projector = createPurchaseMeasurementProjector({
      store,
      isEventEnabled: async () => false,
    });

    await expect(projector.projectPurchase('pay-1')).resolves.toEqual({ status: 'disabled' });
    expect(readPayment).not.toHaveBeenCalled();
    expect(store.outbox.size).toBe(0);
    expect(store.facts.size).toBe(0);
  });

  it('contains gate and lookup outages so analytics never becomes payment authority', async () => {
    const store = new MemoryPurchaseMeasurementStore();
    const projector = createPurchaseMeasurementProjector({
      store,
      isEventEnabled: async () => {
        throw new Error('analytics control unavailable');
      },
    });

    await expect(projector.projectPurchase('pay-1')).resolves.toEqual({ status: 'failed' });
    expect(store.payment?.status).toBe('completed');
  });

  it.each(['promptpay', 'bank_transfer'] as const)(
    'projects an authoritative completed %s payment as a paid purchase',
    async (method) => {
      const store = new MemoryPurchaseMeasurementStore();
      if (!store.payment) throw new Error('missing fixture');
      store.payment = { ...store.payment, method };
      const projector = createPurchaseMeasurementProjector({
        store,
        isEventEnabled: async () => true,
      });

      await expect(projector.projectPurchase('pay-1')).resolves.toEqual({ status: 'projected' });
      expect(store.facts).toEqual(new Set(['pay-1']));
    },
  );

  it('does not classify a zero-value payment as a paid purchase', async () => {
    const store = new MemoryPurchaseMeasurementStore();
    if (!store.payment) throw new Error('missing fixture');
    store.payment = { ...store.payment, method: 'promptpay', amount: '0.00' };
    const projector = createPurchaseMeasurementProjector({ store, isEventEnabled: async () => true });

    await expect(projector.projectPurchase('pay-1')).resolves.toEqual({ status: 'ineligible' });
    expect(store.facts.size).toBe(0);
  });

  it('treats an existing payment fact as a successful idempotent projection', async () => {
    const store = new MemoryPurchaseMeasurementStore();
    store.facts.add('pay-1');
    const projector = createPurchaseMeasurementProjector({
      store,
      isEventEnabled: async () => true,
    });

    await expect(projector.projectPurchase('pay-1')).resolves.toEqual({ status: 'duplicate' });
    expect(store.facts).toEqual(new Set(['pay-1']));
    expect(store.outbox.get('pay-1')?.projected).toBe(true);
  });

  it('keeps the committed payment recoverable when projection fails, then retries to one fact', async () => {
    const store = new MemoryPurchaseMeasurementStore();
    const projector = createPurchaseMeasurementProjector({
      store,
      isEventEnabled: async () => true,
    });
    store.failProjection = true;

    await expect(projector.projectPurchase('pay-1')).resolves.toEqual({ status: 'failed' });
    expect(store.payment?.status).toBe('completed');
    expect(store.facts.size).toBe(0);
    expect(store.failures).toBe(1);

    store.failProjection = false;
    await expect(projector.projectPurchase('pay-1')).resolves.toEqual({ status: 'projected' });
    expect(store.facts).toEqual(new Set(['pay-1']));
  });
});

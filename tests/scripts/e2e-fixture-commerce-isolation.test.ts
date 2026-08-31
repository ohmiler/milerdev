import { describe, expect, it } from 'vitest';

import { E2E_FIXTURES } from '../../e2e/fixtures';

describe('E2E commerce fixture isolation', () => {
  it('uses a different buyer for every payment state', () => {
    const buyerIds = Object.values(E2E_FIXTURES.payments).map(({ userId }) => userId);

    expect(new Set(buyerIds).size).toBe(4);
    expect(buyerIds.sort()).toEqual(
      Object.values(E2E_FIXTURES.buyers).map(({ id }) => id).sort(),
    );
  });

  it('grants access only to the completed-payment buyer', () => {
    expect(E2E_FIXTURES.enrollments.paymentCompleted.userId).toBe(
      E2E_FIXTURES.payments.completed.userId,
    );

    const enrolledUserIds = new Set<string>(
      Object.values(E2E_FIXTURES.enrollments).map(({ userId }) => userId),
    );
    expect(enrolledUserIds.has(E2E_FIXTURES.payments.pending.userId)).toBe(false);
    expect(enrolledUserIds.has(E2E_FIXTURES.payments.failed.userId)).toBe(false);
    expect(enrolledUserIds.has(E2E_FIXTURES.payments.refunded.userId)).toBe(false);
  });
});

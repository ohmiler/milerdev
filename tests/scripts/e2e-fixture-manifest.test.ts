import { describe, expect, it } from 'vitest';

import { E2E_FIXTURES } from '../../e2e/fixtures';

describe('E2E fixture manifest', () => {
  it('names every state required by the deterministic journey contract', () => {
    expect(Object.keys(E2E_FIXTURES.users).sort()).toEqual([
      'emptyMember',
      'instructor',
      'learner',
      'member',
    ]);
    expect(Object.keys(E2E_FIXTURES.courses).sort()).toEqual([
      'certificateMissing',
      'free',
      'longThai',
      'paid',
    ]);
    expect(Object.keys(E2E_FIXTURES.payments).sort()).toEqual([
      'completed',
      'failed',
      'pending',
      'refunded',
    ]);
    expect(Object.keys(E2E_FIXTURES.certificates).sort()).toEqual([
      'active',
      'revoked',
    ]);
    expect(E2E_FIXTURES.analyticsDisabled).toEqual({
      key: 'analytics_enabled',
      value: 'false',
    });
  });

  it('uses unique stable identities and an actually long Thai specimen', () => {
    const ids = [
      ...Object.values(E2E_FIXTURES.users).map(({ id }) => id),
      ...Object.values(E2E_FIXTURES.courses).map(({ id }) => id),
      E2E_FIXTURES.bundle.id,
      ...Object.values(E2E_FIXTURES.payments).map(({ id }) => id),
      ...Object.values(E2E_FIXTURES.certificates).map(({ id }) => id),
    ];

    expect(new Set(ids).size).toBe(ids.length);
    expect(E2E_FIXTURES.courses.longThai.title.length).toBeGreaterThan(100);
    expect(E2E_FIXTURES.courses.free.price).toBe('0.00');
    expect(Number(E2E_FIXTURES.courses.paid.price)).toBeGreaterThan(0);
  });
});

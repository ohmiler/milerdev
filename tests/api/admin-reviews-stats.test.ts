import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  selectResults: [] as unknown[][],
}));

vi.mock('@/lib/auth/helpers', () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock('@/lib/error-handler', () => ({ logError: vi.fn() }));
vi.mock('@/lib/db', () => {
  // Each select() resolves to the next queued result, whatever chain the route builds on it.
  const select = () => {
    const chain: Record<string, unknown> = {};
    for (const method of ['from', 'leftJoin', 'where', 'orderBy', 'limit', 'offset']) chain[method] = () => chain;
    chain.then = (resolve: (rows: unknown[]) => unknown) => resolve(mocks.selectResults.shift() ?? []);
    return chain;
  };
  return { db: { select } };
});

import { GET } from '@/app/api/admin/reviews/route';

describe('GET /api/admin/reviews stats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.selectResults.length = 0;
    mocks.requireAdmin.mockResolvedValue({ session: { user: { id: 'admin-a', role: 'admin' } } });
  });

  it('returns numeric zero counts and no average when there are no reviews', async () => {
    // reviews list, total count, stats (SUM over zero rows is NULL), course list
    mocks.selectResults.push([], [{ count: 0 }], [{ total: 0, avgRating: null, hidden: null, verified: null }], []);

    const response = await GET(new Request('http://localhost/api/admin/reviews'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.stats).toEqual({ total: 0, avgRating: null, hidden: 0, verified: 0 });
  });

  it('converts MySQL decimal strings to numbers', async () => {
    mocks.selectResults.push([], [{ count: 13 }], [{ total: 13, avgRating: '4.6', hidden: '1', verified: '9' }], []);

    const body = await (await GET(new Request('http://localhost/api/admin/reviews'))).json();

    expect(body.stats).toEqual({ total: 13, avgRating: 4.6, hidden: 1, verified: 9 });
  });
});

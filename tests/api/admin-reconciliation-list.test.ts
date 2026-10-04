import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  like: vi.fn(),
  limit: vi.fn(),
  offset: vi.fn(),
  orderBy: vi.fn(),
  selectResults: [] as unknown[][],
}));

vi.mock('@/lib/auth', () => ({ auth: mocks.auth }));
vi.mock('drizzle-orm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('drizzle-orm')>();
  return {
    ...actual,
    like: (...args: Parameters<typeof actual.like>) => {
      mocks.like(args[1]);
      return actual.like(...args);
    },
  };
});
vi.mock('@/lib/db', () => {
  // Each select() resolves to the next queued result and records limit/offset/orderBy.
  const select = () => {
    const chain: Record<string, unknown> = {};
    for (const method of ['from', 'leftJoin', 'where']) chain[method] = () => chain;
    chain.orderBy = (...args: unknown[]) => { mocks.orderBy(...args); return chain; };
    chain.limit = (value: number) => { mocks.limit(value); return chain; };
    chain.offset = (value: number) => { mocks.offset(value); return chain; };
    chain.then = (resolve: (rows: unknown[]) => unknown) => resolve(mocks.selectResults.shift() ?? []);
    return chain;
  };
  return { db: { select, transaction: vi.fn() } };
});

import { GET } from '@/app/api/admin/reconciliation/route';

const admin = { user: { id: 'admin-a', role: 'admin' }, expires: '2099-01-01T00:00:00.000Z' };

function queue(rows: unknown[], total: number, summary = { verifying: 120, failed: 3, pending: 7 }) {
  mocks.selectResults.push(rows, [{ total }], [summary]);
}

function get(query = '') {
  return GET(new Request(`http://localhost/api/admin/reconciliation${query}`));
}

describe('GET /api/admin/reconciliation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.selectResults.length = 0;
    mocks.auth.mockResolvedValue(admin);
  });

  it('rejects anyone who is not an admin', async () => {
    mocks.auth.mockResolvedValue({ user: { id: 'u1', role: 'student' } });
    expect((await get()).status).toBe(401);

    mocks.auth.mockResolvedValue(null);
    expect((await get()).status).toBe(401);
    expect(mocks.limit).not.toHaveBeenCalled();
  });

  it.each([
    '?status=completed',
    '?days=abc',
    '?days=0',
    '?days=91',
    '?page=0',
    '?page=-1',
    '?page=abc',
    `?q=${'x'.repeat(101)}`,
  ])('answers 400 instead of failing the query for %s', async (query) => {
    const response = await get(query);

    expect(response.status).toBe(400);
    expect(mocks.limit).not.toHaveBeenCalled();
  });

  it('returns the first page oldest first with totals and the page size', async () => {
    queue([{ id: 'p1' }], 120);

    const response = await get();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.limit).toHaveBeenCalledWith(50);
    expect(mocks.offset).toHaveBeenCalledWith(0);
    expect(mocks.orderBy).toHaveBeenCalledTimes(1);
    expect(body.pagination).toEqual({ page: 1, pageSize: 50, total: 120, totalPages: 3 });
    expect(body.summary).toEqual({ verifying: 120, failed: 3, pending: 7 });
    // Open cases must not age out of the default queue.
    expect(body.filter).toEqual({ status: 'verifying', days: 'all', q: null });
  });

  it('offsets by whole pages so pages neither overlap nor skip rows', async () => {
    for (const [page, offset] of [[1, 0], [2, 50], [3, 100]] as const) {
      mocks.offset.mockClear();
      queue([], 120);
      await get(`?page=${page}`);
      expect(mocks.offset).toHaveBeenCalledWith(offset);
    }
  });

  it('reports one empty page rather than zero pages when nothing matches', async () => {
    queue([], 0, { verifying: 0, failed: 0, pending: 0 });

    const body = await (await get()).json();

    expect(body.pagination).toEqual({ page: 1, pageSize: 50, total: 0, totalPages: 1 });
  });

  it('accepts every time range, including all, for backlog older than 90 days', async () => {
    queue([], 4);
    const response = await get('?days=all&status=failed');
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.filter).toEqual({ status: 'failed', days: 'all', q: null });
  });

  it('searches by id prefix or email and escapes LIKE wildcards in the term', async () => {
    queue([], 0);

    const response = await get(`?q=${encodeURIComponent('100%_a\\b')}`);

    expect(response.status).toBe(200);
    expect(mocks.like).toHaveBeenCalledWith('100\\%\\_a\\\\b%');
    expect(mocks.like).toHaveBeenCalledWith('%100\\%\\_a\\\\b%');
    expect((await response.json()).filter.q).toBe('100%_a\\b');
  });

  it('treats a blank search as no search', async () => {
    queue([], 0);

    const response = await get('?q=%20%20');

    expect(response.status).toBe(200);
    expect(mocks.like).not.toHaveBeenCalled();
    expect((await response.json()).filter.q).toBeNull();
  });
});

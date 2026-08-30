import { beforeEach, describe, expect, it, vi } from 'vitest';

const { execute } = vi.hoisted(() => ({
  execute: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  db: { execute },
}));

import { GET } from '@/app/api/health/route';

describe('GET /api/health', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 when the application can reach the database', async () => {
    execute.mockResolvedValueOnce(undefined);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store, max-age=0');
    await expect(response.json()).resolves.toEqual({ status: 'ok' });
    expect(execute).toHaveBeenCalledOnce();
  });

  it('returns a generic 503 response without leaking the database error', async () => {
    execute.mockRejectedValueOnce(new Error('connection details'));

    const response = await GET();

    expect(response.status).toBe(503);
    expect(response.headers.get('Cache-Control')).toBe('no-store, max-age=0');
    await expect(response.json()).resolves.toEqual({ status: 'unavailable' });
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MySqlDialect } from 'drizzle-orm/mysql-core';
const mocks = vi.hoisted(() => ({ auth: vi.fn(), set: vi.fn(), where: vi.fn(), update: vi.fn(), limit: vi.fn(), select: vi.fn(), rate: vi.fn() }));
vi.mock('@/lib/auth', () => ({ auth: mocks.auth }));
vi.mock('@/lib/db', () => ({ db: { update: mocks.update, select: mocks.select } }));
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: mocks.rate, rateLimits: { api: {} }, rateLimitResponse: () => new Response(null, { status: 429 }) }));
import { GET, PUT } from '@/app/api/profile/route';
const request = (body: unknown) => new Request('http://localhost/api/profile', { method: 'PUT', body: JSON.stringify(body) });
beforeEach(() => {
  vi.clearAllMocks(); mocks.auth.mockResolvedValue({ user: { id: 'owner' } });
  mocks.rate.mockReturnValue({ success: true });
  mocks.update.mockReturnValue({ set: mocks.set }); mocks.set.mockReturnValue({ where: mocks.where }); mocks.where.mockResolvedValue(undefined);
  mocks.select.mockReturnValue({ from: () => ({ where: () => ({ limit: mocks.limit }) }) });
  mocks.limit.mockResolvedValue([{ id: 'owner', name: 'Name' }]);
});
describe('profile ownership and validation', () => {
  it('rejects unauthenticated reads and writes before database access', async () => {
    mocks.auth.mockResolvedValue(null);
    expect((await GET()).status).toBe(401); expect((await PUT(request({ name: 'Name' }))).status).toBe(401);
    expect(mocks.select).not.toHaveBeenCalled(); expect(mocks.update).not.toHaveBeenCalled();
  });
  it.each([{}, { name: '  ' }, { name: 'a' }, { name: 'a'.repeat(101) }, { name: 'Name', role: 'admin' }])('rejects invalid mutation %j without writes', async (body) => {
    expect((await PUT(request(body))).status).toBe(400); expect(mocks.update).not.toHaveBeenCalled();
  });
  it('normalizes the name and scopes the only write to the authenticated owner', async () => {
    const response = await PUT(request({ name: '  ผู้เรียน ทดสอบ  ' }));
    expect(response.status).toBe(200); expect(await response.json()).toMatchObject({ user: { name: 'ผู้เรียน ทดสอบ' } });
    expect(mocks.set).toHaveBeenCalledWith({ name: 'ผู้เรียน ทดสอบ', updatedAt: expect.any(Date) });
    const query = new MySqlDialect().sqlToQuery(mocks.where.mock.calls[0][0]);
    expect(query.params).toEqual(['owner']); expect(query.sql).toContain('`users`.`id`');
  });
  it('honors rate limits before writing', async () => {
    mocks.rate.mockReturnValue({ success: false }); expect((await PUT(request({ name: 'Name' }))).status).toBe(429);
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it('does not select secret fields and prevents caching private responses', async () => {
    const response = await GET(); expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(Object.keys(mocks.select.mock.calls[0][0])).toEqual(['id', 'name', 'email', 'avatarUrl', 'role', 'createdAt']);
  });
});

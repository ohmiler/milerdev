import { beforeEach, expect, it, vi } from 'vitest';
import { GET } from '@/app/api/payments/route';
const mocks = vi.hoisted(() => ({ auth: vi.fn(), records: vi.fn() }));
vi.mock('@/lib/auth', () => ({ auth: mocks.auth }));
vi.mock('@/lib/payment-records', () => ({ loadPaymentRecords: mocks.records }));
beforeEach(() => vi.resetAllMocks());
it('rejects anonymous history before any private read', async () => {
  mocks.auth.mockResolvedValue(null);
  expect((await GET()).status).toBe(401);
  expect(mocks.records).not.toHaveBeenCalled();
});
it('returns only owner-scoped projections with private no-store caching', async () => {
  mocks.auth.mockResolvedValue({ user: { id: 'member-1' } }); mocks.records.mockResolvedValue([]);
  const response = await GET();
  expect(response.headers.get('Cache-Control')).toBe('private, no-store');
  expect(mocks.records).toHaveBeenCalledWith('member-1');
  expect(await response.json()).toEqual({ payments: [] });
});
it('keeps a failed read distinct from empty history without exposing error details', async () => {
  mocks.auth.mockResolvedValue({ user: { id: 'member-1' } }); mocks.records.mockRejectedValue(new Error('internal detail'));
  const response = await GET();
  expect(response.status).toBe(503);
  expect(await response.text()).not.toContain('internal detail');
});

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/auth-helpers', () => ({ requireAdmin: vi.fn() }));
vi.mock('@/lib/measurement-qualification', () => ({
  measurementQualificationService: { getReport: vi.fn() },
}));
vi.mock('@/lib/error-handler', () => ({ logError: vi.fn() }));

import { requireAdmin } from '@/lib/auth-helpers';
import { measurementQualificationService } from '@/lib/measurement-qualification';

describe('GET /api/admin/reports/measurement-qualification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockResolvedValue({ user: { id: 'admin-1' } } as never);
    vi.mocked(measurementQualificationService.getReport).mockResolvedValue({
      qualification: { status: 'qualified' },
    } as never);
  });

  it('stops before reading measurement data when admin authorization fails', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(new Response(null, { status: 401 }) as never);
    const { GET } = await import('@/app/api/admin/reports/measurement-qualification/route');

    const response = await GET();

    expect(response.status).toBe(401);
    expect(measurementQualificationService.getReport).not.toHaveBeenCalled();
  });

  it('returns the controlled qualification report without caching it', async () => {
    const { GET } = await import('@/app/api/admin/reports/measurement-qualification/route');

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    await expect(response.json()).resolves.toEqual({ qualification: { status: 'qualified' } });
  });
});

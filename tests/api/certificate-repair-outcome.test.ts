import { describe, expect, it, vi } from 'vitest';

const { authMock, checkRateLimitMock, repairOwnerCertificateMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  checkRateLimitMock: vi.fn(),
  repairOwnerCertificateMock: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ auth: authMock }));
vi.mock('@/lib/certificate-credentials', () => ({
  repairOwnerCertificate: repairOwnerCertificateMock,
}));
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: checkRateLimitMock,
  rateLimits: { sensitive: { maxRequests: 5, windowMs: 60_000 } },
  rateLimitResponse: vi.fn(() => new Response(null, { status: 429 })),
}));

import { POST } from '@/app/api/certificates/repair/route';

describe('POST /api/certificates/repair outcome', () => {
  it('uses the session owner and returns a newly issued credential', async () => {
    authMock.mockResolvedValue({ user: { id: 'member-1' } });
    checkRateLimitMock.mockReturnValue({ success: true, resetTime: Date.now() + 60_000 });
    repairOwnerCertificateMock.mockResolvedValue({
      kind: 'issued',
      code: 'CERT-REPAIRED',
    });

    const response = await POST(new Request('http://localhost/api/certificates/repair', {
      method: 'POST',
      body: JSON.stringify({ courseSlug: 'typescript' }),
    }));

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      result: { kind: 'issued', code: 'CERT-REPAIRED' },
    });
    expect(repairOwnerCertificateMock).toHaveBeenCalledWith('member-1', 'typescript');
  });
});

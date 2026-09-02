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

describe('POST /api/certificates/repair rate limit', () => {
  it('rate-limits the authenticated owner before parsing or repairing', async () => {
    authMock.mockResolvedValue({ user: { id: 'member-1' } });
    checkRateLimitMock.mockReturnValue({ success: false, resetTime: Date.now() + 60_000 });

    const response = await POST(new Request('http://localhost/api/certificates/repair', {
      method: 'POST',
      body: JSON.stringify({ courseSlug: 'typescript' }),
    }));

    expect(response.status).toBe(429);
    expect(checkRateLimitMock).toHaveBeenCalledWith(
      'certificate-repair:member-1',
      { maxRequests: 5, windowMs: 60_000 },
    );
    expect(repairOwnerCertificateMock).not.toHaveBeenCalled();
  });
});

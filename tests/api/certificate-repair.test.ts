import { beforeEach, describe, expect, it, vi } from 'vitest';

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

describe('POST /api/certificates/repair', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    checkRateLimitMock.mockReturnValue({ success: true, resetTime: Date.now() + 60_000 });
  });

  it('rejects an unauthenticated repair before reading or mutating certificate state', async () => {
    authMock.mockResolvedValue(null);

    const response = await POST(new Request('http://localhost/api/certificates/repair', {
      method: 'POST',
      body: JSON.stringify({ courseSlug: 'typescript' }),
    }));

    expect(response.status).toBe(401);
    expect(checkRateLimitMock).not.toHaveBeenCalled();
    expect(repairOwnerCertificateMock).not.toHaveBeenCalled();
  });
});

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

describe('POST /api/certificates/repair validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ user: { id: 'member-1' } });
    checkRateLimitMock.mockReturnValue({ success: true, resetTime: Date.now() + 60_000 });
  });

  it('accepts only a course slug and never trusts a client-supplied owner', async () => {
    const response = await POST(new Request('http://localhost/api/certificates/repair', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseSlug: 'typescript', userId: 'other-member' }),
    }));

    expect(response.status).toBe(400);
    expect(repairOwnerCertificateMock).not.toHaveBeenCalled();
  });
});

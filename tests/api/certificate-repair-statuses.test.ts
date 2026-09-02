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

describe('POST /api/certificates/repair statuses', () => {
  it.each([
    [{ kind: 'ready', code: 'CERT-READY' }, 200],
    [{ kind: 'revoked', code: 'CERT-REVOKED' }, 409],
    [{ kind: 'not_completed' }, 409],
    [{ kind: 'temporarily_unavailable' }, 503],
  ] as const)('maps %s to HTTP %s without inventing another state', async (result, status) => {
    authMock.mockResolvedValue({ user: { id: 'member-1' } });
    checkRateLimitMock.mockReturnValue({ success: true, resetTime: Date.now() + 60_000 });
    repairOwnerCertificateMock.mockResolvedValue(result);

    const response = await POST(new Request('http://localhost/api/certificates/repair', {
      method: 'POST',
      body: JSON.stringify({ courseSlug: 'typescript' }),
    }));

    expect(response.status).toBe(status);
    await expect(response.json()).resolves.toEqual({ result });
  });
});

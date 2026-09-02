import { describe, expect, it, vi } from 'vitest';

const { authMock, getOwnerCertificateCollectionMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  getOwnerCertificateCollectionMock: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ auth: authMock }));
vi.mock('@/lib/certificate-credentials', () => ({
  getOwnerCertificateCollection: getOwnerCertificateCollectionMock,
}));

import { GET } from '@/app/api/certificates/route';

describe('GET /api/certificates', () => {
  it('rejects an unauthenticated request before reading certificate data', async () => {
    authMock.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(401);
    expect(getOwnerCertificateCollectionMock).not.toHaveBeenCalled();
  });

  it('returns the owner projection and a minimal active-only compatibility list', async () => {
    authMock.mockResolvedValue({ user: { id: 'member-1' } });
    getOwnerCertificateCollectionMock.mockResolvedValue({
      summary: {
        activeCount: 1,
        revokedCount: 1,
        missingCount: 1,
        hasEnrollment: true,
      },
      items: [
        {
          kind: 'active',
          code: 'CERT-ACTIVE',
          recipientName: 'Learner',
          courseTitle: 'TypeScript',
          courseSlug: 'typescript',
          completedAt: '2026-08-01T00:00:00.000Z',
          issuedAt: '2026-08-02T00:00:00.000Z',
        },
        {
          kind: 'revoked',
          code: 'CERT-REVOKED',
          recipientName: 'Learner',
          courseTitle: 'React',
          courseSlug: 'react',
          completedAt: '2026-07-01T00:00:00.000Z',
          issuedAt: '2026-07-02T00:00:00.000Z',
        },
        {
          kind: 'missing',
          courseTitle: 'Next.js',
          courseSlug: 'nextjs',
          completedAt: '2026-06-01T00:00:00.000Z',
        },
      ],
    });

    const response = await GET();

    expect(response.status).toBe(200);
    expect(getOwnerCertificateCollectionMock).toHaveBeenCalledWith('member-1');
    await expect(response.json()).resolves.toEqual({
      collection: {
        summary: {
          activeCount: 1,
          revokedCount: 1,
          missingCount: 1,
          hasEnrollment: true,
        },
        items: [
          {
            kind: 'active',
            code: 'CERT-ACTIVE',
            recipientName: 'Learner',
            courseTitle: 'TypeScript',
            courseSlug: 'typescript',
            completedAt: '2026-08-01T00:00:00.000Z',
            issuedAt: '2026-08-02T00:00:00.000Z',
          },
          {
            kind: 'revoked',
            code: 'CERT-REVOKED',
            recipientName: 'Learner',
            courseTitle: 'React',
            courseSlug: 'react',
            completedAt: '2026-07-01T00:00:00.000Z',
            issuedAt: '2026-07-02T00:00:00.000Z',
          },
          {
            kind: 'missing',
            courseTitle: 'Next.js',
            courseSlug: 'nextjs',
            completedAt: '2026-06-01T00:00:00.000Z',
          },
        ],
      },
      certificates: [
        {
          id: 'CERT-ACTIVE',
          certificateCode: 'CERT-ACTIVE',
          recipientName: 'Learner',
          courseTitle: 'TypeScript',
          completedAt: '2026-08-01T00:00:00.000Z',
          issuedAt: '2026-08-02T00:00:00.000Z',
        },
      ],
    });
  });
});

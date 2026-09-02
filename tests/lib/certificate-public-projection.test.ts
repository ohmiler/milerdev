import { describe, expect, it, vi } from 'vitest';

import {
  getPublicCertificateVerification,
  type CertificateProjectionStore,
} from '@/lib/certificate-credentials';

function storeFor(
  fact: Awaited<ReturnType<CertificateProjectionStore['readPublic']>>,
): CertificateProjectionStore {
  return {
    readOwner: vi.fn(),
    readPublic: vi.fn().mockResolvedValue(fact),
  };
}

const publicFact = {
  courseId: 'internal-course-id',
  certificateCode: 'CERT-ABCD-2345',
  recipientName: 'Miler Dev',
  courseTitle: 'TypeScript Foundations',
  courseSlug: 'typescript-foundations',
  completedAt: new Date('2026-07-20T00:00:00.000Z'),
  issuedAt: new Date('2026-07-21T00:00:00.000Z'),
  revokedAt: null,
  certificateTheme: '#2563eb',
  certificateHeaderImage: '/certificate-header.png',
};

describe('getPublicCertificateVerification', () => {
  it('returns minimal active, revoked, and not-found verification results', async () => {
    const active = await getPublicCertificateVerification(
      'CERT-ABCD-2345',
      storeFor(publicFact),
    );
    const revoked = await getPublicCertificateVerification(
      'CERT-ABCD-2345',
      storeFor({
        ...publicFact,
        revokedAt: new Date('2026-08-01T00:00:00.000Z'),
      }),
    );
    const notFound = await getPublicCertificateVerification(
      'CERT-MISSING',
      storeFor(null),
    );

    expect(active).toEqual({
      kind: 'active',
      credential: {
        code: 'CERT-ABCD-2345',
        recipientName: 'Miler Dev',
        courseTitle: 'TypeScript Foundations',
        courseSlug: 'typescript-foundations',
        completedAt: '2026-07-20T00:00:00.000Z',
        issuedAt: '2026-07-21T00:00:00.000Z',
        revokedAt: null,
        certificateTheme: '#2563eb',
        certificateHeaderImage: '/certificate-header.png',
      },
    });
    expect(revoked).toMatchObject({
      kind: 'revoked',
      credential: { revokedAt: '2026-08-01T00:00:00.000Z' },
    });
    expect(notFound).toEqual({ kind: 'not_found' });

    const serialized = JSON.stringify([active, revoked]);
    expect(serialized).not.toContain('internal-course-id');
    expect(serialized).not.toContain('userId');
    expect(serialized).not.toContain('revokedReason');
  });
});

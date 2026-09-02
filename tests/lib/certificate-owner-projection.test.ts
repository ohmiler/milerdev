import { describe, expect, it, vi } from 'vitest';

import {
  getOwnerCertificateCollection,
  type CertificateProjectionStore,
} from '@/lib/certificate-credentials';

describe('getOwnerCertificateCollection', () => {
  it('returns active, revoked, and completed-without-certificate descriptors without internal fields', async () => {
    const store: CertificateProjectionStore = {
      readOwner: vi.fn().mockResolvedValue({
        enrollments: [
          {
            courseId: 'internal-course-active',
            courseTitle: 'Active credential course',
            courseSlug: 'active-course',
            enrolledAt: new Date('2026-06-01T00:00:00.000Z'),
            completedAt: new Date('2026-06-20T00:00:00.000Z'),
          },
          {
            courseId: 'internal-course-revoked',
            courseTitle: 'Revoked credential course',
            courseSlug: 'revoked-course',
            enrolledAt: new Date('2026-05-01T00:00:00.000Z'),
            completedAt: new Date('2026-05-20T00:00:00.000Z'),
          },
          {
            courseId: 'internal-course-missing',
            courseTitle: 'Missing credential course',
            courseSlug: 'missing-course',
            enrolledAt: new Date('2026-07-01T00:00:00.000Z'),
            completedAt: new Date('2026-07-20T00:00:00.000Z'),
          },
          {
            courseId: 'internal-course-learning',
            courseTitle: 'Still learning',
            courseSlug: 'still-learning',
            enrolledAt: new Date('2026-08-01T00:00:00.000Z'),
            completedAt: null,
          },
        ],
        certificates: [
          {
            courseId: 'internal-course-active',
            certificateCode: 'CERT-ACTIVE',
            recipientName: 'Miler Dev',
            courseTitle: 'Active credential course',
            courseSlug: 'active-course',
            completedAt: new Date('2026-06-20T00:00:00.000Z'),
            issuedAt: new Date('2026-06-21T00:00:00.000Z'),
            revokedAt: null,
          },
          {
            courseId: 'internal-course-revoked',
            certificateCode: 'CERT-REVOKED',
            recipientName: 'Miler Dev',
            courseTitle: 'Revoked credential course',
            courseSlug: 'revoked-course',
            completedAt: new Date('2026-05-20T00:00:00.000Z'),
            issuedAt: new Date('2026-05-21T00:00:00.000Z'),
            revokedAt: new Date('2026-08-15T00:00:00.000Z'),
          },
        ],
      }),
      readPublic: vi.fn(),
    };

    const collection = await getOwnerCertificateCollection('internal-member-id', store);

    expect(store.readOwner).toHaveBeenCalledWith('internal-member-id');
    expect(collection).toEqual({
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
          recipientName: 'Miler Dev',
          courseTitle: 'Active credential course',
          courseSlug: 'active-course',
          completedAt: '2026-06-20T00:00:00.000Z',
          issuedAt: '2026-06-21T00:00:00.000Z',
        },
        {
          kind: 'revoked',
          code: 'CERT-REVOKED',
          recipientName: 'Miler Dev',
          courseTitle: 'Revoked credential course',
          courseSlug: 'revoked-course',
          completedAt: '2026-05-20T00:00:00.000Z',
          issuedAt: '2026-05-21T00:00:00.000Z',
        },
        {
          kind: 'missing',
          courseTitle: 'Missing credential course',
          courseSlug: 'missing-course',
          completedAt: '2026-07-20T00:00:00.000Z',
        },
      ],
    });

    const serialized = JSON.stringify(collection);
    expect(serialized).not.toContain('internal-member-id');
    expect(serialized).not.toContain('internal-course-');
    expect(serialized).not.toContain('revokedReason');
  });
});

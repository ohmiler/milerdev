import { describe, expect, it, vi } from 'vitest';

import {
  repairOwnerCertificate,
  type CertificateRepairAdapter,
} from '@/lib/certificate-credentials';

describe('repairOwnerCertificate for a revoked credential', () => {
  it('returns revoked without issuing or restoring a credential', async () => {
    const adapter: CertificateRepairAdapter = {
      read: vi.fn().mockResolvedValue({
        courseId: 'internal-course-id',
        completedAt: new Date('2026-08-20T00:00:00.000Z'),
        certificate: {
          code: 'CERT-REVOKED',
          revokedAt: new Date('2026-08-25T00:00:00.000Z'),
        },
      }),
      ensureCompleted: vi.fn(),
    };

    await expect(repairOwnerCertificate('member-1', 'typescript', adapter)).resolves.toEqual({
      kind: 'revoked',
      code: 'CERT-REVOKED',
    });
    expect(adapter.ensureCompleted).not.toHaveBeenCalled();
  });
});

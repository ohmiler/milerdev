import { describe, expect, it, vi } from 'vitest';

import {
  repairOwnerCertificate,
  type CertificateRepairAdapter,
} from '@/lib/certificate-credentials';

describe('repairOwnerCertificate completion authority', () => {
  it('does not issue when the owner has no authoritative completion', async () => {
    const adapter: CertificateRepairAdapter = {
      read: vi.fn().mockResolvedValue({
        courseId: 'internal-course-id',
        completedAt: null,
        certificate: null,
      }),
      ensureCompleted: vi.fn(),
    };

    await expect(repairOwnerCertificate('member-1', 'typescript', adapter)).resolves.toEqual({
      kind: 'not_completed',
    });
    expect(adapter.ensureCompleted).not.toHaveBeenCalled();
  });
});

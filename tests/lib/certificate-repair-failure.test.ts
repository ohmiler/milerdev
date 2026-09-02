import { describe, expect, it, vi } from 'vitest';

import {
  repairOwnerCertificate,
  type CertificateRepairAdapter,
} from '@/lib/certificate-credentials';

describe('repairOwnerCertificate failure recovery', () => {
  it('returns temporarily unavailable without exposing issuance failure details', async () => {
    const adapter: CertificateRepairAdapter = {
      read: vi.fn().mockResolvedValue({
        courseId: 'internal-course-id',
        completedAt: new Date('2026-08-20T00:00:00.000Z'),
        certificate: null,
      }),
      ensureCompleted: vi.fn().mockRejectedValue(
        new Error('private database and email provider detail'),
      ),
    };

    const result = await repairOwnerCertificate('member-1', 'typescript', adapter);

    expect(result).toEqual({ kind: 'temporarily_unavailable' });
    expect(JSON.stringify(result)).not.toContain('private database');
  });
});

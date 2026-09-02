import { describe, expect, it, vi } from 'vitest';

import {
  repairOwnerCertificate,
  type CertificateRepairAdapter,
} from '@/lib/certificate-credentials';

describe('repairOwnerCertificate', () => {
  it('issues a completed missing credential once and returns ready on replay', async () => {
    let certificate: { code: string; revokedAt: Date | null } | null = null;
    const adapter: CertificateRepairAdapter = {
      read: vi.fn().mockImplementation(async () => ({
        courseId: 'internal-course-id',
        completedAt: new Date('2026-08-20T00:00:00.000Z'),
        certificate,
      })),
      ensureCompleted: vi.fn().mockImplementation(async () => {
        certificate = { code: 'CERT-REPAIRED', revokedAt: null };
        return { kind: 'issued', code: 'CERT-REPAIRED' };
      }),
    };

    await expect(repairOwnerCertificate('member-1', 'typescript', adapter)).resolves.toEqual({
      kind: 'issued',
      code: 'CERT-REPAIRED',
    });
    await expect(repairOwnerCertificate('member-1', 'typescript', adapter)).resolves.toEqual({
      kind: 'ready',
      code: 'CERT-REPAIRED',
    });

    expect(adapter.read).toHaveBeenCalledTimes(2);
    expect(adapter.read).toHaveBeenCalledWith('member-1', 'typescript');
    expect(adapter.ensureCompleted).toHaveBeenCalledOnce();
    expect(adapter.ensureCompleted).toHaveBeenCalledWith('member-1', 'internal-course-id');
  });
});

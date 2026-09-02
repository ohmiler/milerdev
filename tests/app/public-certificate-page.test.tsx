import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

const { getPublicCertificateVerificationMock } = vi.hoisted(() => ({
  getPublicCertificateVerificationMock: vi.fn(),
}));

vi.mock('@/lib/certificate-credentials', () => ({
  getPublicCertificateVerification: getPublicCertificateVerificationMock,
}));
vi.mock('@/lib/db', () => ({ db: {} }));
vi.mock('@/components/layout/Navbar', () => ({ default: () => <div data-layout="navbar" /> }));
vi.mock('@/components/layout/Footer', () => ({ default: () => <div data-layout="footer" /> }));
vi.mock('@/components/certificate/CertificateCard', () => ({
  default: ({ cert }: { cert: Record<string, unknown> }) => (
    <div data-certificate={JSON.stringify(cert)} />
  ),
}));

import CertificatePage from '@/app/certificate/[code]/page';

describe('public certificate page', () => {
  it('renders from the minimal public verification projection', async () => {
    getPublicCertificateVerificationMock.mockResolvedValue({
      kind: 'active',
      credential: {
        code: 'CERT-PUBLIC',
        recipientName: 'Learner',
        courseTitle: 'TypeScript',
        courseSlug: 'typescript',
        completedAt: '2026-08-01T00:00:00.000Z',
        issuedAt: '2026-08-02T00:00:00.000Z',
        revokedAt: null,
        certificateTheme: '#2563eb',
        certificateHeaderImage: null,
      },
    });

    const html = renderToStaticMarkup(await CertificatePage({
      params: Promise.resolve({ code: 'CERT-PUBLIC' }),
    }));

    expect(getPublicCertificateVerificationMock).toHaveBeenCalledWith('CERT-PUBLIC');
    expect(html).toContain('CERT-PUBLIC');
    expect(html).not.toContain('userId');
    expect(html).not.toContain('courseId');
    expect(html).not.toContain('revokedReason');
  });

  it('does not import database authority into the public page', () => {
    const source = readFileSync('src/app/certificate/[code]/page.tsx', 'utf8');

    expect(source).toContain('getPublicCertificateVerification');
    expect(source).not.toContain("from '@/lib/db'");
    expect(source).not.toContain("from '@/lib/db/schema'");
  });
});

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('learning progress certificate boundary', () => {
  it('uses the completion-authorized idempotent issuer after progress commits', () => {
    const source = readFileSync('src/lib/learning-progress.ts', 'utf8');

    expect(source).toContain("import { ensureCompletedCertificate } from '@/lib/certificate'");
    expect(source).toContain('await ensureCompletedCertificate(input.userId, result.courseId)');
    expect(source).toContain("certificate.kind === 'issued'");
    expect(source).not.toContain('await issueCertificate(input.userId, result.courseId)');
  });
});

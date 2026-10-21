import { afterEach, describe, expect, it, vi } from 'vitest';

import { generateCertificateCode } from '@/lib/certificates/code';

const CODE_FORMAT = /^CERT-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/;

describe('certificate codes', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('keeps the CERT-XXXX-XXXX format over the unambiguous alphabet', () => {
    for (let index = 0; index < 500; index++) {
      expect(generateCertificateCode()).toMatch(CODE_FORMAT);
    }
  });

  it('never draws from Math.random, whose state can be recovered from a few observed codes', () => {
    const random = vi.spyOn(Math, 'random');

    for (let index = 0; index < 20; index++) generateCertificateCode();

    expect(random).not.toHaveBeenCalled();
  });

  it('uses every symbol of the 32-character alphabet', () => {
    const seen = new Set<string>();
    for (let index = 0; index < 2_000; index++) {
      for (const symbol of generateCertificateCode().replace(/^CERT-|-/g, '')) seen.add(symbol);
    }

    expect(seen.size).toBe(32);
  });
});

import { describe, expect, it } from 'vitest';

import {
  DEFAULT_CERTIFICATE_COLOR,
  isHtmlCertificateColor,
  normalizeCertificateColor,
} from '@/lib/certificate-color';
import { normalizeImageUrl } from '@/lib/url';

describe('admin media input normalization', () => {
  it.each(['blue', 'var(--primary)', '', 'not-a-color', null, undefined])(
    'normalizes legacy or invalid certificate color %s',
    (value) => {
      expect(normalizeCertificateColor(value)).toBe(DEFAULT_CERTIFICATE_COLOR);
    },
  );

  it('keeps complete HTML colors and canonicalizes their case', () => {
    expect(normalizeCertificateColor('#A1B2C3')).toBe('#a1b2c3');
    expect(isHtmlCertificateColor('#123abc')).toBe(true);
    expect(isHtmlCertificateColor('#2')).toBe(false);
  });

  it.each([
    ['https://cdn.example.com/course.jpg', 'https://cdn.example.com/course.jpg'],
    ['/uploads/course.jpg', '/uploads/course.jpg'],
    ['cdn.example.com/course.jpg', 'https://cdn.example.com/course.jpg'],
    ['//cdn.example.com/course.jpg', 'https://cdn.example.com/course.jpg'],
  ])('normalizes image URL %s', (value, expected) => {
    expect(normalizeImageUrl(value)).toBe(expected);
  });

  it.each(['', 'not a url', 'javascript:alert(1)', 'data:image/png;base64,abc'])(
    'rejects unsafe or invalid image URL %s',
    (value) => {
      expect(normalizeImageUrl(value)).toBeNull();
    },
  );
});

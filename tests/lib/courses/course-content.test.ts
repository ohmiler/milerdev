import { describe, expect, it } from 'vitest';

import {
  contentLinesToList,
  contentListToLines,
  normalizeContentList,
  normalizeSummary,
} from '@/lib/courses/content';

describe('structured course content', () => {
  it('turns the admin textarea into one item per non-empty line and back', () => {
    const text = ' ใช้ Hooks \r\n\n สร้างโปรเจกต์จริง ';

    expect(contentLinesToList(text)).toEqual(['ใช้ Hooks', 'สร้างโปรเจกต์จริง']);
    expect(contentListToLines(['ใช้ Hooks', 'สร้างโปรเจกต์จริง'])).toBe('ใช้ Hooks\nสร้างโปรเจกต์จริง');
    expect(contentListToLines(null)).toBe('');
  });

  it('stores an empty list or a blank summary as null, so the page leaves the group out', () => {
    expect(normalizeContentList(['  ', ''])).toBeNull();
    expect(normalizeContentList(undefined)).toBeNull();
    expect(normalizeContentList([' a ', 'b'])).toEqual(['a', 'b']);
    expect(normalizeSummary('   ')).toBeNull();
    expect(normalizeSummary(' สรุป ')).toBe('สรุป');
  });
});

import { describe, expect, it } from 'vitest';

import {
  requirePublishedBundleCourses,
} from '@/lib/bundle-commerce';

describe('bundle commerce integrity', () => {
  it('accepts a non-empty bundle only when every child is published', () => {
    expect(requirePublishedBundleCourses([
      { id: 'course-b', status: 'published' },
      { id: 'course-a', status: 'published' },
    ])).toEqual(['course-a', 'course-b']);
  });

  it.each([
    { rows: [], code: 'BUNDLE_HAS_NO_COURSES' },
    { rows: [{ id: 'course-1', status: 'draft' as const }], code: 'BUNDLE_CHILD_NOT_PUBLISHED' },
    { rows: [{ id: 'course-1', status: 'archived' as const }], code: 'BUNDLE_CHILD_NOT_PUBLISHED' },
  ])('rejects an unsaleable composition: $code', ({ rows, code }) => {
    expect(() => requirePublishedBundleCourses(rows)).toThrowError(
      expect.objectContaining({ code }),
    );
  });
});

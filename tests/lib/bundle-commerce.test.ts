import { describe, expect, it } from 'vitest';

import {
  requirePublishedBundleCourses,
  requireReadyBundleCourses,
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

  it('accepts enrollment only when every published child has lessons', () => {
    expect(requireReadyBundleCourses([
      { id: 'course-b', status: 'published', lessonCount: 2 },
      { id: 'course-a', status: 'published', lessonCount: 1 },
    ])).toEqual(['course-a', 'course-b']);
  });

  it('reports every child that has no lessons', () => {
    expect(() => requireReadyBundleCourses([
      { id: 'course-a', status: 'published', lessonCount: 0 },
      { id: 'course-b', status: 'published', lessonCount: 3 },
    ])).toThrowError(expect.objectContaining({
      code: 'BUNDLE_CHILD_NOT_READY',
      blockingCourseIds: ['course-a'],
    }));
  });
});

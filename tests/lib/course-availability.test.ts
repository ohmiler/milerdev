import { describe, expect, it } from 'vitest';

import { COURSE_NOT_READY, requireCourseHasLessons } from '@/lib/course-availability';

describe('course enrollment availability', () => {
  it('accepts a course with at least one lesson', () => {
    expect(() => requireCourseHasLessons(1)).not.toThrow();
  });

  it.each([0, -1, Number.NaN])('rejects an unavailable lesson count: %s', (lessonCount) => {
    expect(() => requireCourseHasLessons(lessonCount)).toThrowError(
      expect.objectContaining({ code: COURSE_NOT_READY }),
    );
  });
});

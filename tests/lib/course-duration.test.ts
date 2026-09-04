import { describe, expect, it } from 'vitest';

import { formatCourseDuration } from '@/lib/course-duration';

describe('formatCourseDuration', () => {
  it.each([
    [5_460, '1 ชม. 31 นาที'],
    [3_600, '1 ชม.'],
    [1_800, '30 นาที'],
    [59, null],
    [null, null],
  ] as const)('formats %s seconds as concise Thai evidence', (seconds, expected) => {
    expect(formatCourseDuration(seconds)).toBe(expected);
  });
});

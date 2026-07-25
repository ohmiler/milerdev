import { describe, expect, it } from 'vitest';

import { parseCourseLifecycleSmokeTarget } from '../../scripts/course-lifecycle-smoke-target';

describe('course lifecycle smoke target guard', () => {
  it('accepts only local milerdev', () => {
    expect(parseCourseLifecycleSmokeTarget(
      'mysql://operator:secret@localhost:3306/milerdev',
    )).toEqual({ database: 'milerdev', hostname: 'localhost', port: 3306 });
  });

  it.each([
    'mysql://operator:secret@example.com:3306/milerdev',
    'mysql://operator:secret@localhost:3307/milerdev',
    'mysql://operator:secret@localhost:3306/milerdev_course_lifecycle_fresh',
    'postgres://operator:secret@localhost:3306/milerdev',
  ])('rejects unauthorized target %s', (databaseUrl) => {
    expect(() => parseCourseLifecycleSmokeTarget(databaseUrl)).toThrow();
  });
});

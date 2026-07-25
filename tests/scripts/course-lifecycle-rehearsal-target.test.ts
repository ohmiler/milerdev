import { describe, expect, it } from 'vitest';

import {
  parseCourseLifecycleRehearsalTarget,
  type CourseLifecycleRehearsalMode,
} from '../../scripts/course-lifecycle-rehearsal-target';

describe('course lifecycle rehearsal target guard', () => {
  it.each<[CourseLifecycleRehearsalMode, string]>([
    ['fresh', 'milerdev_course_lifecycle_fresh'],
    ['upgrade-base', 'milerdev_course_lifecycle_upgrade'],
    ['inspect-upgrade', 'milerdev_course_lifecycle_upgrade'],
    ['upgrade-lifecycle', 'milerdev_course_lifecycle_upgrade'],
  ])('accepts the exact disposable local target for %s', (mode, database) => {
    expect(parseCourseLifecycleRehearsalTarget(
      `mysql://operator:secret@localhost:3306/${database}`,
      mode,
    )).toEqual({ database, hostname: 'localhost', port: 3306 });
  });

  it.each([
    ['mysql://operator:secret@localhost:3306/milerdev', 'protected or unauthorized schema'],
    ['mysql://operator:secret@example.com:3306/milerdev_course_lifecycle_fresh', 'local MySQL server'],
    ['mysql://operator:secret@localhost:3307/milerdev_course_lifecycle_fresh', 'port 3306'],
    ['postgres://operator:secret@localhost:3306/milerdev_course_lifecycle_fresh', 'MySQL URL'],
  ])('rejects unsafe target without echoing credentials', (databaseUrl, message) => {
    expect(() => parseCourseLifecycleRehearsalTarget(databaseUrl, 'fresh')).toThrow(message);
    try {
      parseCourseLifecycleRehearsalTarget(databaseUrl, 'fresh');
    } catch (error) {
      expect(String(error)).not.toContain(databaseUrl);
      expect(String(error)).not.toContain('secret');
    }
  });
});

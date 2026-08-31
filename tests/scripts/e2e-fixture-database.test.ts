import { describe, expect, it } from 'vitest';

import {
  assertE2EFixtureDatabaseReady,
  REQUIRED_E2E_TABLES,
} from '../../scripts/e2e-fixture-database';

const target = {
  database: 'milerdev_e2e' as const,
  hostname: '127.0.0.1',
  port: 3306 as const,
};

const readyState = {
  databaseName: 'milerdev_e2e',
  serverPort: 3306,
  migrationCount: 15,
  missingTables: [] as string[],
  existingDomainRows: 0,
};

describe('E2E fixture database readiness', () => {
  it('accepts an empty migrated database matching the authorized target', () => {
    expect(() => assertE2EFixtureDatabaseReady(target, readyState)).not.toThrow();
    expect(REQUIRED_E2E_TABLES).toEqual(expect.arrayContaining([
      'users',
      'courses',
      'lessons',
      'enrollments',
      'payments',
      'bundles',
      'bundle_courses',
      'certificates',
      'settings',
    ]));
  });

  it.each([
    [{ ...readyState, databaseName: 'milerdev' }, 'identity'],
    [{ ...readyState, serverPort: 3307 }, 'identity'],
    [{ ...readyState, migrationCount: 0 }, 'migrated'],
    [{ ...readyState, missingTables: ['payments'] }, 'missing required tables'],
    [{ ...readyState, existingDomainRows: 1 }, 'must be empty'],
  ])('rejects unsafe state %j', (state, message) => {
    expect(() => assertE2EFixtureDatabaseReady(target, state)).toThrow(message);
  });
});

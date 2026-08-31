import type { E2EFixtureTarget } from './e2e-fixture-target';

export const REQUIRED_E2E_TABLES = [
  'users',
  'courses',
  'lessons',
  'enrollments',
  'lesson_progress',
  'payments',
  'bundles',
  'bundle_courses',
  'certificates',
  'settings',
] as const;

export type E2EFixtureDatabaseState = {
  databaseName: string | null;
  serverPort: number;
  migrationCount: number;
  missingTables: string[];
  existingDomainRows: number;
};

export function assertE2EFixtureDatabaseReady(
  target: E2EFixtureTarget,
  state: E2EFixtureDatabaseState,
): void {
  if (
    state.databaseName !== target.database
    || state.serverPort !== target.port
  ) {
    throw new Error('Connected MySQL identity does not match the authorized E2E target');
  }

  if (state.migrationCount < 1) {
    throw new Error('E2E fixture database must be migrated before seeding');
  }

  if (state.missingTables.length > 0) {
    throw new Error(
      `E2E fixture database is missing required tables: ${state.missingTables.join(', ')}`,
    );
  }

  if (state.existingDomainRows !== 0) {
    throw new Error('E2E fixture database must be empty before seeding');
  }
}

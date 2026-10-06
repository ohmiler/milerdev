import { assertLocalDatabase } from '../local-database-target';

// Demo courses are fake products with fake reviews, so they are seeded into local databases only.
export function assertLocalDemoTarget(databaseUrl: string | undefined, nodeEnv: string | undefined): void {
  assertLocalDatabase(databaseUrl, nodeEnv, 'Demo course seeding');
}

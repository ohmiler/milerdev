// Runs the Required E2E job on this machine the way CI does: it empties the loopback
// `milerdev_e2e` database, migrates it, seeds the deterministic fixtures, then runs the real-MySQL
// integration tests and the required browser journeys. It sets throwaway values for every secret it
// needs and refuses any database other than loopback `milerdev_e2e`; the browser server also
// blocks external network calls (e2e/required/server-network-guard.mjs).
//   npm run test:e2e:local
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import mysql, { type RowDataPacket } from 'mysql2/promise';

import { parseE2EFixtureTarget } from './e2e-fixture-target';

const DATABASE_URL = 'mysql://e2e_test@127.0.0.1:3306/milerdev_e2e';
const APP_URL = 'http://127.0.0.1:3100';

async function emptyE2EDatabase(): Promise<void> {
  const target = parseE2EFixtureTarget(DATABASE_URL);
  const connection = await mysql.createConnection(DATABASE_URL);
  try {
    const [identity] = await connection.query<RowDataPacket[]>('SELECT DATABASE() AS databaseName, @@port AS serverPort');
    if (identity[0]?.databaseName !== target.database || Number(identity[0]?.serverPort) !== target.port) {
      throw new Error('Connected MySQL identity does not match the local E2E database');
    }
    const [tables] = await connection.query<RowDataPacket[]>(
      'SELECT table_name AS name, table_type AS type FROM information_schema.tables WHERE table_schema = ?',
      [target.database],
    );
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const { name, type } of tables) {
      const identifier = `\`${String(name).replace(/`/g, '``')}\``;
      await connection.query(`DROP ${type === 'VIEW' ? 'VIEW' : 'TABLE'} IF EXISTS ${identifier}`);
    }
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log(`Emptied ${target.database} (${tables.length} tables)`);
  } finally {
    await connection.end();
  }
}

function run(label: string, command: string, args: string[], env: NodeJS.ProcessEnv): void {
  console.log(`\n== ${label}`);
  const result = spawnSync(command, args, { env, stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.status !== 0) {
    console.error(`${label} failed`);
    process.exit(result.status ?? 1);
  }
}

async function main(): Promise<void> {
  await emptyE2EDatabase();
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    DATABASE_URL,
    E2E_DATABASE_URL: DATABASE_URL,
    AUTH_SECRET: randomBytes(32).toString('hex'),
    NEXTAUTH_URL: APP_URL,
    NEXT_PUBLIC_APP_URL: APP_URL,
  };
  run('Migrate', 'npm', ['run', 'db:migrate'], env);
  run('Seed fixtures', 'npm', ['run', 'db:fixtures:e2e'], env);
  run('MySQL integration tests', 'npx', ['vitest', 'run', '--config', 'vitest.mysql.config.ts'], env);
  run('Required browser journeys', 'npm', ['run', 'test:e2e:required'], env);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

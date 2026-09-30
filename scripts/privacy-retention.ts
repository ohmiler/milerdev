import mysql from 'mysql2/promise';
import { PRIVACY_RETENTION_POLICY, runPrivacyRetention } from '../src/lib/privacy-retention';

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const confirmation = `--confirm-policy=${PRIVACY_RETENTION_POLICY}`;
  if (args.some((arg) => !['--apply', confirmation].includes(arg)) || (apply && !args.includes(confirmation))) {
    throw new Error('Explicit policy confirmation is required for apply');
  }
  // The operator supplies the connection. Never load environment files or print it.
  if (!process.env.DATABASE_URL) throw new Error('Operator configuration required');
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  try {
    console.log(JSON.stringify(await runPrivacyRetention(connection, { apply })));
  } finally { await connection.end(); }
}

main().catch(() => {
  console.error('Privacy retention did not complete. Check configuration, lock availability and database health.');
  process.exitCode = 1;
});

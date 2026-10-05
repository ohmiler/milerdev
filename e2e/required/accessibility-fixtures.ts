import mysql, { type RowDataPacket } from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import { and, eq, like } from 'drizzle-orm';
import { parseE2EFixtureTarget } from '../../scripts/e2e-fixture-target';
import { users } from '../../src/lib/db/schema';

// Gives the synthetic accessibility account the admin role, on the isolated E2E database only.
export async function promoteAccessibilityAdmin(userId: string) {
  const target = parseE2EFixtureTarget(process.env.E2E_DATABASE_URL);
  const connection = await mysql.createConnection(process.env.E2E_DATABASE_URL!);
  try {
    const [identity] = await connection.query<RowDataPacket[]>('SELECT DATABASE() AS db, @@port AS port');
    if (identity[0]?.db !== target.database || Number(identity[0]?.port) !== target.port) throw new Error('E2E identity mismatch');
    const db = drizzle(connection);
    const [result] = await db.update(users).set({ role: 'admin' })
      .where(and(eq(users.id, userId), like(users.email, 'accessibility-%@example.test')));
    if (result.affectedRows !== 1) throw new Error('The accessibility admin must be its own synthetic account');
  } finally { await connection.end(); }
}

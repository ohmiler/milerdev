import { createId } from '@paralleldrive/cuid2';
import { eq } from 'drizzle-orm';
import type { MySql2Database } from 'drizzle-orm/mysql2';

import * as schema from '../../src/lib/db/schema';
import { planLocalAdminWrite, type LocalAdminOptions, type LocalAdminWrite } from './plan';

/** Creates or promotes the admin in one transaction, locking the account row while it decides. */
export function writeLocalAdmin(
  db: MySql2Database<typeof schema>,
  options: LocalAdminOptions,
  passwordHash: string,
  now = new Date(),
): Promise<LocalAdminWrite> {
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select({
        id: schema.users.id,
        name: schema.users.name,
        emailVerifiedAt: schema.users.emailVerifiedAt,
        sessionVersion: schema.users.sessionVersion,
      })
      .from(schema.users)
      .where(eq(schema.users.email, options.email))
      .limit(1)
      .for('update');
    const plan = planLocalAdminWrite(existing ?? null, { ...options, passwordHash, now, newId: createId() });
    if (plan.action === 'insert') await tx.insert(schema.users).values(plan.values);
    else await tx.update(schema.users).set(plan.values).where(eq(schema.users.id, plan.id));
    return plan;
  });
}

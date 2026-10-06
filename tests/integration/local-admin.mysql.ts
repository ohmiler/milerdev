import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomBytes } from 'node:crypto';
import argon2 from 'argon2';
import { drizzle, type MySql2Database } from 'drizzle-orm/mysql2';
import { eq, inArray } from 'drizzle-orm';
import mysql from 'mysql2/promise';
import * as schema from '@/lib/db/schema';
import { verifyPassword } from '@/lib/auth/password-storage';
import { writeLocalAdmin } from '../../scripts/local-admin/write';

/**
 * The local admin tool on real MySQL: it creates or promotes an account that can then sign in
 * with the new password, and promoting signs out the account's earlier sessions.
 */

let connection: mysql.Connection;
let db: MySql2Database<typeof schema>;
const suffix = randomBytes(6).toString('hex');
const emails: string[] = [];
const email = (label: string) => {
    const value = `local-admin-${label}-${suffix}@example.test`;
    emails.push(value);
    return value;
};
const readUser = async (address: string) => (await db.select().from(schema.users).where(eq(schema.users.email, address)))[0];

beforeAll(async () => {
    // Deliberately refuse owner databases and non-loopback connections.
    const target = new URL(process.env.DATABASE_URL ?? 'invalid');
    if (target.protocol !== 'mysql:' || target.hostname !== '127.0.0.1' || target.pathname !== '/milerdev_e2e') {
        throw new Error('Local admin integration tests require the dedicated loopback milerdev_e2e database');
    }
    connection = await mysql.createConnection(process.env.DATABASE_URL!);
    db = drizzle(connection, { schema, mode: 'default' });
});

afterAll(async () => {
    if (!db) return;
    if (emails.length) await db.delete(schema.users).where(inArray(schema.users.email, emails));
    await connection.end();
});

describe('local admin tool on real MySQL', () => {
    it('creates a verified admin that can sign in with the new password', async () => {
        const address = email('new');
        const password = `local admin ${suffix} passphrase`;

        const result = await writeLocalAdmin(db, { email: address, name: 'Owner' }, await argon2.hash(password, { type: argon2.argon2id }));

        expect(result.action).toBe('insert');
        const user = await readUser(address);
        expect(user).toMatchObject({ role: 'admin', name: 'Owner', deactivatedAt: null });
        expect(user.emailVerifiedAt).not.toBeNull();
        expect(await verifyPassword(password, user.passwordHash!)).toBe(true);
    });

    it('promotes an existing student, replaces the password and signs out old sessions', async () => {
        const address = email('existing');
        await db.insert(schema.users).values({ email: address, name: 'Student', role: 'student', sessionVersion: 2, passwordHash: await argon2.hash('old password value long', { type: argon2.argon2id }), resetToken: 'pending-reset' });
        const password = `promoted ${suffix} passphrase`;

        const result = await writeLocalAdmin(db, { email: address, name: null }, await argon2.hash(password, { type: argon2.argon2id }));

        expect(result.action).toBe('update');
        const user = await readUser(address);
        expect(user).toMatchObject({ role: 'admin', name: 'Student', sessionVersion: 3, resetToken: null });
        expect(await verifyPassword(password, user.passwordHash!)).toBe(true);
        expect(await verifyPassword('old password value long', user.passwordHash!)).toBe(false);
    });
});

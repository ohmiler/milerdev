import bcrypt from 'bcryptjs';
import mysql, { type RowDataPacket } from 'mysql2/promise';

import {
    parseUserLifecycleSmokeTarget,
    validateUserLifecycleSmokePassword,
} from './user-lifecycle-smoke-target';

class SmokeFixtureError extends Error {}

type CountRow = RowDataPacket & { count: number | string };

const FIXTURES = {
    admin: {
        id: 'local-lifecycle-admin',
        email: 'lifecycle-admin@local.test',
        name: 'Local Lifecycle Admin',
        role: 'admin',
    },
    student: {
        id: 'local-lifecycle-student',
        email: 'lifecycle-student@local.test',
        name: 'Local Lifecycle Student',
        role: 'student',
    },
} as const;

async function queryCount(
    connection: mysql.Connection,
    statement: string,
    values: unknown[] = [],
): Promise<number> {
    const [rows] = await connection.query<CountRow[]>(statement, values);
    return Number(rows[0]?.count ?? 0);
}

async function main(): Promise<void> {
    const databaseUrl = process.env.USER_LIFECYCLE_SMOKE_DATABASE_URL;
    const adminPassword = process.env.USER_LIFECYCLE_SMOKE_ADMIN_PASSWORD;
    const studentPassword = process.env.USER_LIFECYCLE_SMOKE_STUDENT_PASSWORD;

    let target;
    try {
        target = parseUserLifecycleSmokeTarget(databaseUrl);
        validateUserLifecycleSmokePassword(adminPassword);
        validateUserLifecycleSmokePassword(studentPassword);
    } catch (error) {
        throw new SmokeFixtureError(
            error instanceof Error ? error.message : 'Invalid smoke fixture input',
        );
    }

    const connection = await mysql.createConnection(databaseUrl!);
    try {
        const [identityRows] = await connection.query<Array<RowDataPacket & {
            databaseName: string | null;
            serverPort: number;
        }>>('SELECT DATABASE() AS databaseName, @@port AS serverPort');
        const identity = identityRows[0];
        if (
            identity?.databaseName !== target.database
            || Number(identity.serverPort) !== target.port
        ) {
            throw new SmokeFixtureError(
                'Connected MySQL identity does not match the authorized smoke target',
            );
        }

        const [tableCount, migrationCount, lifecycleColumnCount, lifecycleIndexCount] =
            await Promise.all([
                queryCount(
                    connection,
                    `SELECT COUNT(*) AS count
                     FROM information_schema.tables
                     WHERE table_schema = ?`,
                    [target.database],
                ),
                queryCount(connection, 'SELECT COUNT(*) AS count FROM `__drizzle_migrations`'),
                queryCount(
                    connection,
                    `SELECT COUNT(*) AS count
                     FROM information_schema.columns
                     WHERE table_schema = ? AND table_name = 'users'
                       AND column_name = 'deactivated_at'`,
                    [target.database],
                ),
                queryCount(
                    connection,
                    `SELECT COUNT(*) AS count
                     FROM information_schema.statistics
                     WHERE table_schema = ? AND table_name = 'users'
                       AND index_name = 'idx_users_deactivated_at'`,
                    [target.database],
                ),
            ]);

        if (
            tableCount !== 29
            || migrationCount !== 13
            || lifecycleColumnCount !== 1
            || lifecycleIndexCount !== 1
        ) {
            throw new SmokeFixtureError(
                'Local schema is not at the expected 0012 smoke-test contract',
            );
        }

        if (await queryCount(connection, 'SELECT COUNT(*) AS count FROM `users`') !== 0) {
            throw new SmokeFixtureError('Smoke fixtures require an empty users table');
        }

        const [adminPasswordHash, studentPasswordHash] = await Promise.all([
            bcrypt.hash(adminPassword!, 12),
            bcrypt.hash(studentPassword!, 12),
        ]);
        const now = new Date();

        await connection.beginTransaction();
        try {
            await connection.execute(
                `INSERT INTO users
                    (id, email, password_hash, name, role, session_version,
                     deactivated_at, email_verified_at, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, 0, NULL, ?, ?, ?), (?, ?, ?, ?, ?, 0, NULL, ?, ?, ?)`,
                [
                    FIXTURES.admin.id,
                    FIXTURES.admin.email,
                    adminPasswordHash,
                    FIXTURES.admin.name,
                    FIXTURES.admin.role,
                    now,
                    now,
                    now,
                    FIXTURES.student.id,
                    FIXTURES.student.email,
                    studentPasswordHash,
                    FIXTURES.student.name,
                    FIXTURES.student.role,
                    now,
                    now,
                    now,
                ],
            );
            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        }

        console.log(JSON.stringify({
            status: 'created',
            target,
            userCount: await queryCount(connection, 'SELECT COUNT(*) AS count FROM `users`'),
            adminEmail: FIXTURES.admin.email,
            studentEmail: FIXTURES.student.email,
        }));
    } finally {
        await connection.end();
    }
}

main().catch((error) => {
    if (error instanceof SmokeFixtureError) {
        console.error(error.message);
    } else {
        console.error('Smoke fixture creation failed');
    }
    process.exit(1);
});
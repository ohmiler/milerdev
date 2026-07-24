import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { drizzle } from 'drizzle-orm/mysql2';
import { migrate } from 'drizzle-orm/mysql2/migrator';
import mysql, { type RowDataPacket } from 'mysql2/promise';

import { getSafeMigrationFailureMessage } from '../src/lib/db/migration-error';
import {
    classifyUpgradeVerificationCheckpoint,
    isUserLifecycleRehearsalMode,
    parseUserLifecycleRehearsalTarget,
    type UserLifecycleRehearsalMode,
} from './user-lifecycle-rehearsal-target';

class RehearsalError extends Error {}

type CountRow = RowDataPacket & { count: number | string };

const FIXTURES = {
    adminA: 'lifecycle-admin-a',
    adminB: 'lifecycle-admin-b',
    student: 'lifecycle-student',
    account: 'lifecycle-account',
    course: 'lifecycle-course',
    lesson: 'lifecycle-lesson',
    enrollment: 'lifecycle-enrollment',
    progress: 'lifecycle-progress',
    payment: 'lifecycle-payment',
    notification: 'lifecycle-notification',
    review: 'lifecycle-review',
    audit: 'lifecycle-audit',
    coupon: 'lifecycle-coupon',
    couponUsage: 'lifecycle-coupon-usage',
    certificate: 'lifecycle-certificate',
} as const;

const RETAINED_FIXTURE_TABLES = [
    'accounts',
    'enrollments',
    'lesson_progress',
    'payments',
    'notifications',
    'reviews',
    'coupon_usages',
    'certificates',
] as const;

async function queryCount(
    connection: mysql.Connection,
    statement: string,
    values: unknown[] = [],
): Promise<number> {
    const [rows] = await connection.query<CountRow[]>(statement, values);
    return Number(rows[0]?.count ?? 0);
}

async function assertEmptySchema(
    connection: mysql.Connection,
    database: string,
): Promise<void> {
    const tableCount = await queryCount(
        connection,
        'SELECT COUNT(*) AS count FROM information_schema.tables WHERE table_schema = ?',
        [database],
    );
    if (tableCount !== 0) {
        throw new RehearsalError('Rehearsal requires an empty disposable schema');
    }
}

async function createUpgradeBaseFolder(): Promise<string> {
    const source = path.resolve(process.cwd(), 'drizzle');
    const destination = await mkdtemp(path.join(tmpdir(), 'milerdev-lifecycle-'));
    const meta = path.join(destination, 'meta');
    await mkdir(meta);

    const journal = JSON.parse(
        await readFile(path.join(source, 'meta', '_journal.json'), 'utf8'),
    ) as { entries: Array<{ idx: number; tag: string }>; [key: string]: unknown };
    const entries = journal.entries.filter((entry) => entry.idx <= 11);
    if (entries.length !== 12 || entries.at(-1)?.tag !== '0011_auth_shared_rate_limit') {
        throw new RehearsalError('Migration journal does not contain the expected 0000-0011 base');
    }

    await writeFile(
        path.join(meta, '_journal.json'),
        `${JSON.stringify({ ...journal, entries }, null, 2)}\n`,
        'utf8',
    );
    await Promise.all(entries.map((entry) => copyFile(
        path.join(source, `${entry.tag}.sql`),
        path.join(destination, `${entry.tag}.sql`),
    )));
    return destination;
}

async function seedUpgradeFixtures(connection: mysql.Connection): Promise<void> {
    const existingUsers = await queryCount(
        connection,
        'SELECT COUNT(*) AS count FROM `users` WHERE `id` IN (?, ?, ?)',
        [FIXTURES.adminA, FIXTURES.adminB, FIXTURES.student],
    );
    if (existingUsers !== 0) {
        throw new RehearsalError('Representative fixtures already exist');
    }

    await connection.beginTransaction();
    try {
        await connection.execute(
            `INSERT INTO users (id, email, name, role, session_version, reset_token, reset_expires)
             VALUES (?, ?, ?, 'admin', 0, NULL, NULL), (?, ?, ?, 'admin', 0, NULL, NULL),
                    (?, ?, ?, 'student', 0, 'fake-reset-token', DATE_ADD(NOW(), INTERVAL 1 HOUR))`,
            [
                FIXTURES.adminA, 'lifecycle-admin-a@example.invalid', 'Lifecycle Admin A',
                FIXTURES.adminB, 'lifecycle-admin-b@example.invalid', 'Lifecycle Admin B',
                FIXTURES.student, 'lifecycle-student@example.invalid', 'Lifecycle Student',
            ],
        );
        await connection.execute(
            `INSERT INTO accounts (id, userId, type, provider, providerAccountId)
             VALUES (?, ?, 'oauth', 'rehearsal', 'lifecycle-student-provider')`,
            [FIXTURES.account, FIXTURES.student],
        );
        await connection.execute(
            `INSERT INTO courses (id, title, slug, price, status, instructor_id)
             VALUES (?, 'Lifecycle rehearsal course', 'lifecycle-rehearsal-course', '100.00', 'published', ?)`,
            [FIXTURES.course, FIXTURES.adminA],
        );
        await connection.execute(
            `INSERT INTO lessons (id, course_id, title, order_index)
             VALUES (?, ?, 'Lifecycle rehearsal lesson', 1)`,
            [FIXTURES.lesson, FIXTURES.course],
        );
        await connection.execute(
            `INSERT INTO enrollments (id, user_id, course_id, progress_percent)
             VALUES (?, ?, ?, 100)`,
            [FIXTURES.enrollment, FIXTURES.student, FIXTURES.course],
        );
        await connection.execute(
            `INSERT INTO lesson_progress (id, user_id, lesson_id, completed, watch_time_seconds)
             VALUES (?, ?, ?, true, 120)`,
            [FIXTURES.progress, FIXTURES.student, FIXTURES.lesson],
        );
        await connection.execute(
            `INSERT INTO payments (id, user_id, course_id, amount, method, status, item_title)
             VALUES (?, ?, ?, '100.00', 'bank_transfer', 'completed', 'Lifecycle rehearsal course')`,
            [FIXTURES.payment, FIXTURES.student, FIXTURES.course],
        );
        await connection.execute(
            `INSERT INTO notifications (id, user_id, title, message)
             VALUES (?, ?, 'Lifecycle rehearsal', 'Fake notification fixture')`,
            [FIXTURES.notification, FIXTURES.student],
        );
        await connection.execute(
            `INSERT INTO reviews (id, user_id, course_id, rating, comment, display_name)
             VALUES (?, ?, ?, 5, 'Fake review fixture', 'Lifecycle Student')`,
            [FIXTURES.review, FIXTURES.student, FIXTURES.course],
        );
        await connection.execute(
            `INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, new_value)
             VALUES (?, ?, 'create', 'fixture', ?, 'fake-rehearsal-data')`,
            [FIXTURES.audit, FIXTURES.adminA, FIXTURES.student],
        );
        await connection.execute(
            `INSERT INTO coupons (id, code, discount_type, discount_value, course_id)
             VALUES (?, 'LIFECYCLE-REHEARSAL', 'fixed', '10.00', ?)`,
            [FIXTURES.coupon, FIXTURES.course],
        );
        await connection.execute(
            `INSERT INTO coupon_usages (id, coupon_id, user_id, course_id, discount_amount)
             VALUES (?, ?, ?, ?, '10.00')`,
            [FIXTURES.couponUsage, FIXTURES.coupon, FIXTURES.student, FIXTURES.course],
        );
        await connection.execute(
            `INSERT INTO certificates
                (id, user_id, course_id, certificate_code, recipient_name, course_title, completed_at)
             VALUES (?, ?, ?, 'LIFECYCLE-TEST', 'Lifecycle Student', 'Lifecycle rehearsal course', NOW())`,
            [FIXTURES.certificate, FIXTURES.student, FIXTURES.course],
        );
        await connection.commit();
    } catch (error) {
        await connection.rollback();
        throw error;
    }
}

async function fixtureCounts(connection: mysql.Connection): Promise<Record<string, number>> {
    const counts: Record<string, number> = {
        users: await queryCount(
            connection,
            'SELECT COUNT(*) AS count FROM users WHERE id IN (?, ?, ?)',
            [FIXTURES.adminA, FIXTURES.adminB, FIXTURES.student],
        ),
        audit_logs: await queryCount(
            connection,
            'SELECT COUNT(*) AS count FROM audit_logs WHERE entity_id = ?',
            [FIXTURES.student],
        ),
    };
    for (const table of RETAINED_FIXTURE_TABLES) {
        counts[table] = await queryCount(
            connection,
            `SELECT COUNT(*) AS count FROM \`${table}\` WHERE id = ?`,
            [FIXTURES[table === 'lesson_progress' ? 'progress'
                : table === 'coupon_usages' ? 'couponUsage'
                    : table.slice(0, -1) as keyof typeof FIXTURES]],
        );
    }
    return counts;
}

async function inspectFixtureState(connection: mysql.Connection) {
    const [studentRows] = await connection.query<Array<RowDataPacket & {
        deactivatedAt: Date | null;
        resetToken: string | null;
        resetExpires: Date | null;
        sessionVersion: number;
    }>>(
        `SELECT deactivated_at AS deactivatedAt, reset_token AS resetToken,
                reset_expires AS resetExpires, session_version AS sessionVersion
         FROM users WHERE id = ?`,
        [FIXTURES.student],
    );
    const student = studentRows[0];
    const [activeAdminCount, inactiveAdminCount, adminLifecycleAuditCount] = await Promise.all([
        queryCount(
            connection,
            "SELECT COUNT(*) AS count FROM users WHERE id IN (?, ?) AND role = 'admin' AND deactivated_at IS NULL",
            [FIXTURES.adminA, FIXTURES.adminB],
        ),
        queryCount(
            connection,
            "SELECT COUNT(*) AS count FROM users WHERE id IN (?, ?) AND role = 'admin' AND deactivated_at IS NOT NULL",
            [FIXTURES.adminA, FIXTURES.adminB],
        ),
        queryCount(
            connection,
            `SELECT COUNT(*) AS count FROM audit_logs
             WHERE entity_type = 'user' AND action = 'update' AND entity_id IN (?, ?)`,
            [FIXTURES.adminA, FIXTURES.adminB],
        ),
    ]);
    return {
        fixtureCounts: await fixtureCounts(connection),
        studentExists: student !== undefined,
        studentInactive: student ? student.deactivatedAt !== null : null,
        studentSessionVersion: student?.sessionVersion ?? null,
        studentResetTokenPresent: student ? student.resetToken !== null : null,
        studentResetExpiryPresent: student ? student.resetExpires !== null : null,
        activeAdminCount,
        inactiveAdminCount,
        adminLifecycleAuditCount,
    };
}

function requireFixtureCounts(counts: Record<string, number>, expectedAuditCount: number): void {
    if (counts.users !== 3 || counts.audit_logs !== expectedAuditCount) {
        throw new RehearsalError('Representative user or audit fixture count changed unexpectedly');
    }
    for (const table of RETAINED_FIXTURE_TABLES) {
        if (counts[table] !== 1) {
            throw new RehearsalError(`Representative ${table} fixture was not retained`);
        }
    }
}

async function exerciseLifecycleBehavior(
    connection: mysql.Connection,
    databaseUrl: string,
): Promise<{ activeAdminCount: number; concurrencySuccessCount: number; studentInactive: boolean }> {
    process.env.DATABASE_URL = databaseUrl;
    process.env.DB_CONNECTION_LIMIT = '4';
    const { userLifecycleService } = await import('../src/lib/user-lifecycle');
    const auditContext = { ipAddress: '127.0.0.1', userAgent: 'user-lifecycle-rehearsal' };

    const first = await userLifecycleService.setLifecycle({
        actorId: FIXTURES.adminA,
        targetIds: [FIXTURES.student],
        action: 'deactivate',
        auditContext,
    });
    const retry = await userLifecycleService.setLifecycle({
        actorId: FIXTURES.adminA,
        targetIds: [FIXTURES.student],
        action: 'deactivate',
        auditContext,
    });
    if (first.changedCount !== 1 || retry.changedCount !== 0) {
        throw new RehearsalError('Lifecycle deactivation was not idempotent on MySQL');
    }

    const outcomes = await Promise.allSettled([
        userLifecycleService.setLifecycle({
            actorId: FIXTURES.adminA,
            targetIds: [FIXTURES.adminB],
            action: 'deactivate',
            auditContext,
        }),
        userLifecycleService.setLifecycle({
            actorId: FIXTURES.adminB,
            targetIds: [FIXTURES.adminA],
            action: 'deactivate',
            auditContext,
        }),
    ]);
    const concurrencySuccessCount = outcomes.filter((outcome) => outcome.status === 'fulfilled').length;
    const activeAdminCount = await queryCount(
        connection,
        "SELECT COUNT(*) AS count FROM users WHERE role = 'admin' AND deactivated_at IS NULL",
    );
    if (concurrencySuccessCount !== 1 || activeAdminCount !== 1) {
        throw new RehearsalError('Concurrent lifecycle transitions violated the active-admin invariant');
    }

    const [inactiveAdmins] = await connection.query<Array<RowDataPacket & { id: string }>>(
        "SELECT id FROM users WHERE role = 'admin' AND deactivated_at IS NOT NULL",
    );
    const [activeAdmins] = await connection.query<Array<RowDataPacket & { id: string }>>(
        "SELECT id FROM users WHERE role = 'admin' AND deactivated_at IS NULL",
    );
    await userLifecycleService.setLifecycle({
        actorId: activeAdmins[0].id,
        targetIds: [inactiveAdmins[0].id],
        action: 'reactivate',
        auditContext,
    });

    const [studentRows] = await connection.query<Array<RowDataPacket & {
        deactivatedAt: Date | null;
        resetToken: string | null;
        resetExpires: Date | null;
        sessionVersion: number;
    }>>(
        `SELECT deactivated_at AS deactivatedAt, reset_token AS resetToken,
                reset_expires AS resetExpires, session_version AS sessionVersion
         FROM users WHERE id = ?`,
        [FIXTURES.student],
    );
    const student = studentRows[0];
    const studentInactive = student?.deactivatedAt !== null;
    if (!studentInactive || student.resetToken !== null || student.resetExpires !== null || student.sessionVersion !== 1) {
        throw new RehearsalError('Deactivated student state does not match the lifecycle contract');
    }

    return { activeAdminCount, concurrencySuccessCount, studentInactive };
}

async function verifyExistingUpgradeBehavior(
    connection: mysql.Connection,
    databaseUrl: string,
) {
    const contract = await inspectLifecycleContract(connection, 'milerdev_lifecycle_upgrade');
    if (contract.columnCount !== 1 || contract.indexCount !== 1 || contract.migrationCount !== 13) {
        throw new RehearsalError('Upgrade verification requires the expected 0012 contract');
    }
    const state = await inspectFixtureState(connection);
    requireFixtureCounts(state.fixtureCounts, 2);
    if (
        !state.studentExists
        || !state.studentInactive
        || state.studentSessionVersion !== 1
        || state.studentResetTokenPresent
        || state.studentResetExpiryPresent
    ) {
        throw new RehearsalError('Upgrade verification requires the observed post-student checkpoint');
    }
    const checkpoint = classifyUpgradeVerificationCheckpoint(state);
    if (checkpoint === 'complete') {
        return {
            alreadyVerified: true,
            concurrencySuccessCount: state.adminLifecycleAuditCount / 2,
            outcomeSummary: ['previously-completed'],
            finalState: state,
        };
    }
    if (checkpoint !== 'ready') {
        throw new RehearsalError('Upgrade verification found an inconsistent Admin checkpoint');
    }

    process.env.DATABASE_URL = databaseUrl;
    process.env.DB_CONNECTION_LIMIT = '4';
    const { UserLifecycleError, userLifecycleService } = await import('../src/lib/user-lifecycle');
    const auditContext = { ipAddress: '127.0.0.1', userAgent: 'user-lifecycle-rehearsal' };
    const outcomes = await Promise.allSettled([
        userLifecycleService.setLifecycle({
            actorId: FIXTURES.adminA,
            targetIds: [FIXTURES.adminB],
            action: 'deactivate',
            auditContext,
        }),
        userLifecycleService.setLifecycle({
            actorId: FIXTURES.adminB,
            targetIds: [FIXTURES.adminA],
            action: 'deactivate',
            auditContext,
        }),
    ]);
    const outcomeSummary = outcomes.map((outcome) => {
        if (outcome.status === 'fulfilled') return 'fulfilled';
        if (outcome.reason instanceof UserLifecycleError) return `domain:${outcome.reason.code}`;
        return getSafeMigrationFailureMessage(outcome.reason);
    });
    const concurrencySuccessCount = outcomes.filter((outcome) => outcome.status === 'fulfilled').length;
    const activeAdminCount = await queryCount(
        connection,
        "SELECT COUNT(*) AS count FROM users WHERE id IN (?, ?) AND role = 'admin' AND deactivated_at IS NULL",
        [FIXTURES.adminA, FIXTURES.adminB],
    );
    if (concurrencySuccessCount !== 1 || activeAdminCount !== 1) {
        throw new RehearsalError(
            `Admin concurrency diagnostic failed: ${outcomeSummary.join(',')}; activeAdmins=${activeAdminCount}`,
        );
    }

    const [inactiveAdmins] = await connection.query<Array<RowDataPacket & { id: string }>>(
        "SELECT id FROM users WHERE id IN (?, ?) AND role = 'admin' AND deactivated_at IS NOT NULL",
        [FIXTURES.adminA, FIXTURES.adminB],
    );
    const [activeAdmins] = await connection.query<Array<RowDataPacket & { id: string }>>(
        "SELECT id FROM users WHERE id IN (?, ?) AND role = 'admin' AND deactivated_at IS NULL",
        [FIXTURES.adminA, FIXTURES.adminB],
    );
    await userLifecycleService.setLifecycle({
        actorId: activeAdmins[0].id,
        targetIds: [inactiveAdmins[0].id],
        action: 'reactivate',
        auditContext,
    });

    const finalState = await inspectFixtureState(connection);
    requireFixtureCounts(finalState.fixtureCounts, 2);
    if (
        classifyUpgradeVerificationCheckpoint(finalState) !== 'complete'
        || finalState.adminLifecycleAuditCount < 2
    ) {
        throw new RehearsalError('Admin recovery did not restore the two fake active admins');
    }
    return { concurrencySuccessCount, outcomeSummary, finalState };
}

async function inspectLifecycleContract(
    connection: mysql.Connection,
    database: string,
): Promise<{ columnCount: number; indexCount: number; migrationCount: number; tableCount: number }> {
    const [columnCount, indexCount, migrationCount, tableCount] = await Promise.all([
        queryCount(
            connection,
            `SELECT COUNT(*) AS count
             FROM information_schema.columns
             WHERE table_schema = ? AND table_name = 'users' AND column_name = 'deactivated_at'
               AND is_nullable = 'YES' AND column_default IS NULL`,
            [database],
        ),
        queryCount(
            connection,
            `SELECT COUNT(*) AS count
             FROM information_schema.statistics
             WHERE table_schema = ? AND table_name = 'users'
               AND index_name = 'idx_users_deactivated_at' AND non_unique = 1`,
            [database],
        ),
        queryCount(connection, 'SELECT COUNT(*) AS count FROM `__drizzle_migrations`'),
        queryCount(
            connection,
            'SELECT COUNT(*) AS count FROM information_schema.tables WHERE table_schema = ?',
            [database],
        ),
    ]);
    return { columnCount, indexCount, migrationCount, tableCount };
}

async function run(mode: UserLifecycleRehearsalMode): Promise<void> {
    const databaseUrl = process.env.USER_LIFECYCLE_DATABASE_URL;
    let target;
    try {
        target = parseUserLifecycleRehearsalTarget(databaseUrl, mode);
    } catch (error) {
        throw new RehearsalError(
            error instanceof Error ? error.message : 'Invalid rehearsal target',
        );
    }
    const connection = await mysql.createConnection(databaseUrl!);
    let temporaryFolder: string | undefined;

    try {
        const [identityRows] = await connection.query<Array<RowDataPacket & {
            databaseName: string | null;
            serverPort: number;
        }>>('SELECT DATABASE() AS databaseName, @@port AS serverPort');
        const identity = identityRows[0];
        if (identity?.databaseName !== target.database || Number(identity.serverPort) !== target.port) {
            throw new RehearsalError('Connected MySQL identity does not match the authorized target');
        }

        if (mode === 'inspect-upgrade') {
            console.log(JSON.stringify({
                status: 'inspected',
                mode,
                target,
                ...await inspectLifecycleContract(connection, target.database),
                ...await inspectFixtureState(connection),
            }));
            return;
        }

        if (mode === 'verify-upgrade') {
            console.log(JSON.stringify({
                status: 'passed',
                mode,
                target,
                ...await verifyExistingUpgradeBehavior(connection, databaseUrl!),
            }));
            return;
        }

        if (mode === 'fresh' || mode === 'upgrade-base') {
            await assertEmptySchema(connection, target.database);
        }

        if (mode === 'upgrade-lifecycle') {
            const before = await inspectLifecycleContract(connection, target.database);
            if (before.columnCount !== 0 || before.indexCount !== 0 || before.migrationCount !== 12) {
                throw new RehearsalError('Upgrade schema is not at the expected 0011 base');
            }
            await seedUpgradeFixtures(connection);
        }

        const preMigrationFixtureCounts = mode === 'upgrade-lifecycle'
            ? await fixtureCounts(connection)
            : undefined;
        if (preMigrationFixtureCounts) requireFixtureCounts(preMigrationFixtureCounts, 1);

        const migrationsFolder = mode === 'upgrade-base'
            ? (temporaryFolder = await createUpgradeBaseFolder())
            : path.resolve(process.cwd(), 'drizzle');
        await migrate(drizzle(connection), { migrationsFolder });

        const after = await inspectLifecycleContract(connection, target.database);
        const expectedMigrations = mode === 'upgrade-base' ? 12 : 13;
        const expectedLifecycleObjects = mode === 'upgrade-base' ? 0 : 1;
        if (
            after.migrationCount !== expectedMigrations
            || after.columnCount !== expectedLifecycleObjects
            || after.indexCount !== expectedLifecycleObjects
        ) {
            throw new RehearsalError('Migration result does not match the expected lifecycle contract');
        }

        const postMigrationFixtureCounts = mode === 'upgrade-lifecycle'
            ? await fixtureCounts(connection)
            : undefined;
        if (postMigrationFixtureCounts) {
            requireFixtureCounts(postMigrationFixtureCounts, 1);
            if (JSON.stringify(postMigrationFixtureCounts) !== JSON.stringify(preMigrationFixtureCounts)) {
                throw new RehearsalError('Representative fixture counts changed during migration');
            }
        }
        const behavior = mode === 'upgrade-lifecycle'
            ? await exerciseLifecycleBehavior(connection, databaseUrl!)
            : undefined;
        const postLifecycleFixtureCounts = mode === 'upgrade-lifecycle'
            ? await fixtureCounts(connection)
            : undefined;
        if (postLifecycleFixtureCounts) {
            requireFixtureCounts(postLifecycleFixtureCounts, 2);
        }

        console.log(JSON.stringify({
            status: 'passed',
            mode,
            target,
            ...after,
            ...(preMigrationFixtureCounts ? { preMigrationFixtureCounts } : {}),
            ...(postMigrationFixtureCounts ? { postMigrationFixtureCounts } : {}),
            ...(postLifecycleFixtureCounts ? { postLifecycleFixtureCounts } : {}),
            ...(behavior ? { behavior } : {}),
        }));
    } finally {
        await connection.end();
        if (temporaryFolder) {
            await rm(temporaryFolder, { recursive: true, force: true });
        }
    }
}

const mode = process.argv[2];
if (!isUserLifecycleRehearsalMode(mode)) {
    console.error('Usage: npm run db:rehearse:user-lifecycle -- fresh|upgrade-base|inspect-upgrade|verify-upgrade|upgrade-lifecycle');
    process.exit(1);
}

run(mode).then(() => process.exit(0)).catch((error) => {
    console.error(error instanceof RehearsalError
        ? error.message
        : getSafeMigrationFailureMessage(error));
    process.exit(1);
});

import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { drizzle } from 'drizzle-orm/mysql2';
import { migrate } from 'drizzle-orm/mysql2/migrator';
import mysql, { type RowDataPacket } from 'mysql2/promise';

import { getSafeMigrationFailureMessage } from '../src/lib/db/migration-error';
import {
  isCourseLifecycleRehearsalMode,
  parseCourseLifecycleRehearsalTarget,
  type CourseLifecycleRehearsalMode,
} from './course-lifecycle-rehearsal-target';

class RehearsalError extends Error {}

type CountRow = RowDataPacket & { count: number | string };

const FIXTURES = {
  admin: 'course-lifecycle-admin',
  student: 'course-lifecycle-student',
  course: 'course-lifecycle-course',
  lesson: 'course-lifecycle-lesson',
  enrollment: 'course-lifecycle-enrollment',
  progress: 'course-lifecycle-progress',
  payment: 'course-lifecycle-payment',
  review: 'course-lifecycle-review',
  coupon: 'course-lifecycle-coupon',
  couponUsage: 'course-lifecycle-coupon-usage',
  certificate: 'course-lifecycle-certificate',
  bundle: 'course-lifecycle-bundle',
  bundleCourse: 'course-lifecycle-bundle-course',
  audit: 'course-lifecycle-audit',
} as const;

const RETAINED_FIXTURES = {
  users: FIXTURES.student,
  courses: FIXTURES.course,
  lessons: FIXTURES.lesson,
  enrollments: FIXTURES.enrollment,
  lesson_progress: FIXTURES.progress,
  payments: FIXTURES.payment,
  reviews: FIXTURES.review,
  coupons: FIXTURES.coupon,
  coupon_usages: FIXTURES.couponUsage,
  certificates: FIXTURES.certificate,
  bundles: FIXTURES.bundle,
  bundle_courses: FIXTURES.bundleCourse,
} as const;

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
  const destination = await mkdtemp(path.join(tmpdir(), 'milerdev-course-lifecycle-'));
  const meta = path.join(destination, 'meta');
  await mkdir(meta);

  const journal = JSON.parse(
    await readFile(path.join(source, 'meta', '_journal.json'), 'utf8'),
  ) as { entries: Array<{ idx: number; tag: string }>; [key: string]: unknown };
  const entries = journal.entries.filter((entry) => entry.idx <= 12);
  if (entries.length !== 13 || entries.at(-1)?.tag !== '0012_user_lifecycle') {
    throw new RehearsalError('Migration journal does not contain the expected 0000-0012 base');
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
  const existing = await queryCount(
    connection,
    'SELECT COUNT(*) AS count FROM courses WHERE id = ?',
    [FIXTURES.course],
  );
  if (existing !== 0) {
    throw new RehearsalError('Representative course fixtures already exist');
  }

  await connection.beginTransaction();
  try {
    await connection.execute(
      `INSERT INTO users (id, email, name, role, session_version)
       VALUES (?, 'course-lifecycle-admin@example.invalid', 'Course Lifecycle Admin', 'admin', 0),
              (?, 'course-lifecycle-student@example.invalid', 'Course Lifecycle Student', 'student', 0)`,
      [FIXTURES.admin, FIXTURES.student],
    );
    await connection.execute(
      `INSERT INTO courses (id, title, slug, price, status, instructor_id)
       VALUES (?, 'Course lifecycle rehearsal', 'course-lifecycle-rehearsal', '100.00', 'published', ?)`,
      [FIXTURES.course, FIXTURES.admin],
    );
    await connection.execute(
      `INSERT INTO lessons (id, course_id, title, order_index)
       VALUES (?, ?, 'Retained lesson', 1)`,
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
       VALUES (?, ?, ?, '100.00', 'promptpay', 'completed', 'Course lifecycle rehearsal')`,
      [FIXTURES.payment, FIXTURES.student, FIXTURES.course],
    );
    await connection.execute(
      `INSERT INTO reviews (id, user_id, course_id, rating, comment, display_name)
       VALUES (?, ?, ?, 5, 'Retained review', 'Course Lifecycle Student')`,
      [FIXTURES.review, FIXTURES.student, FIXTURES.course],
    );
    await connection.execute(
      `INSERT INTO coupons (id, code, discount_type, discount_value, course_id)
       VALUES (?, 'COURSE-LIFECYCLE', 'fixed', '10.00', ?)`,
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
       VALUES (?, ?, ?, 'COURSE-LIFECYCLE', 'Course Lifecycle Student',
               'Course lifecycle rehearsal', NOW())`,
      [FIXTURES.certificate, FIXTURES.student, FIXTURES.course],
    );
    await connection.execute(
      `INSERT INTO bundles (id, title, slug, price, status)
       VALUES (?, 'Course lifecycle bundle', 'course-lifecycle-bundle', '100.00', 'draft')`,
      [FIXTURES.bundle],
    );
    await connection.execute(
      `INSERT INTO bundle_courses (id, bundle_id, course_id, order_index)
       VALUES (?, ?, ?, 0)`,
      [FIXTURES.bundleCourse, FIXTURES.bundle, FIXTURES.course],
    );
    await connection.execute(
      `INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, new_value)
       VALUES (?, ?, 'create', 'fixture', ?, 'course-lifecycle-rehearsal')`,
      [FIXTURES.audit, FIXTURES.admin, FIXTURES.course],
    );
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  }
}

async function fixtureCounts(connection: mysql.Connection): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const [table, id] of Object.entries(RETAINED_FIXTURES)) {
    counts[table] = await queryCount(
      connection,
      `SELECT COUNT(*) AS count FROM \`${table}\` WHERE id = ?`,
      [id],
    );
  }
  return counts;
}

function requireFixtureCounts(counts: Record<string, number>): void {
  for (const table of Object.keys(RETAINED_FIXTURES)) {
    if (counts[table] !== 1) {
      throw new RehearsalError(`Representative ${table} fixture was not retained`);
    }
  }
}

async function inspectContract(
  connection: mysql.Connection,
  database: string,
): Promise<{
  columnCount: number;
  indexCount: number;
  migrationCount: number;
  tableCount: number;
}> {
  const [columnCount, indexCount, migrationCount, tableCount] = await Promise.all([
    queryCount(
      connection,
      `SELECT COUNT(*) AS count
       FROM information_schema.columns
       WHERE table_schema = ? AND table_name = 'payments'
         AND column_name = 'coupon_id' AND is_nullable = 'YES'`,
      [database],
    ),
    queryCount(
      connection,
      `SELECT COUNT(*) AS count
       FROM information_schema.statistics
       WHERE table_schema = ? AND table_name = 'payments'
         AND index_name = 'idx_payments_coupon_id' AND non_unique = 1`,
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

async function exerciseLifecycleBehavior(
  connection: mysql.Connection,
  databaseUrl: string,
) {
  const initialNullCouponCount = await queryCount(
    connection,
    'SELECT COUNT(*) AS count FROM payments WHERE id = ? AND coupon_id IS NULL',
    [FIXTURES.payment],
  );
  if (initialNullCouponCount !== 1) {
    throw new RehearsalError('Existing payment did not retain a null coupon after migration');
  }

  process.env.DATABASE_URL = databaseUrl;
  process.env.DB_CONNECTION_LIMIT = '4';
  const { CourseLifecycleError, courseLifecycleService } =
    await import('../src/lib/course-lifecycle');
  const context = { ipAddress: '127.0.0.1', userAgent: 'course-lifecycle-rehearsal' };

  const archive = await courseLifecycleService.transition({
    actorId: FIXTURES.admin,
    courseId: FIXTURES.course,
    action: 'archive',
    expectedStatus: 'published',
    auditContext: context,
  });
  const retry = await courseLifecycleService.transition({
    actorId: FIXTURES.admin,
    courseId: FIXTURES.course,
    action: 'archive',
    expectedStatus: 'published',
    auditContext: context,
  });
  if (archive.changedCount !== 1 || retry.changedCount !== 0) {
    throw new RehearsalError('Course archive was not idempotent on MySQL');
  }

  await courseLifecycleService.transition({
    actorId: FIXTURES.admin,
    courseId: FIXTURES.course,
    action: 'restore',
    expectedStatus: 'archived',
    auditContext: context,
  });
  await courseLifecycleService.transition({
    actorId: FIXTURES.admin,
    courseId: FIXTURES.course,
    action: 'publish',
    expectedStatus: 'draft',
    auditContext: context,
  });

  await connection.execute(
    "UPDATE bundles SET status = 'published' WHERE id = ?",
    [FIXTURES.bundle],
  );
  let bundleConflictObserved = false;
  try {
    await courseLifecycleService.transition({
      actorId: FIXTURES.admin,
      courseId: FIXTURES.course,
      action: 'archive',
      expectedStatus: 'published',
      auditContext: context,
    });
  } catch (error) {
    bundleConflictObserved = error instanceof CourseLifecycleError
      && error.code === 'PUBLISHED_BUNDLE_DEPENDENCY'
      && error.blockingBundles.some((bundle) => bundle.id === FIXTURES.bundle);
  }
  if (!bundleConflictObserved) {
    throw new RehearsalError('Published Bundle dependency did not block archive');
  }
  await connection.execute(
    "UPDATE bundles SET status = 'draft' WHERE id = ?",
    [FIXTURES.bundle],
  );

  const outcomes = await Promise.allSettled([
    courseLifecycleService.transition({
      actorId: FIXTURES.admin,
      courseId: FIXTURES.course,
      action: 'archive',
      expectedStatus: 'published',
      auditContext: context,
    }),
    courseLifecycleService.transition({
      actorId: FIXTURES.admin,
      courseId: FIXTURES.course,
      action: 'archive',
      expectedStatus: 'published',
      auditContext: context,
    }),
  ]);
  const fulfilledCount = outcomes.filter((outcome) => outcome.status === 'fulfilled').length;
  const changedCount = outcomes.reduce(
    (sum, outcome) => outcome.status === 'fulfilled'
      ? sum + outcome.value.changedCount
      : sum,
    0,
  );
  if (
    fulfilledCount !== 2
    || changedCount !== 1
  ) {
    throw new RehearsalError('Concurrent archive did not converge idempotently');
  }

  await courseLifecycleService.transition({
    actorId: FIXTURES.admin,
    courseId: FIXTURES.course,
    action: 'restore',
    expectedStatus: 'archived',
    auditContext: context,
  });

  await connection.execute(
    'UPDATE payments SET coupon_id = ? WHERE id = ?',
    [FIXTURES.coupon, FIXTURES.payment],
  );
  const couponLinkedCount = await queryCount(
    connection,
    'SELECT COUNT(*) AS count FROM payments WHERE id = ? AND coupon_id = ?',
    [FIXTURES.payment, FIXTURES.coupon],
  );
  const [courseRows] = await connection.query<Array<RowDataPacket & { status: string }>>(
    'SELECT status FROM courses WHERE id = ?',
    [FIXTURES.course],
  );
  if (couponLinkedCount !== 1 || courseRows[0]?.status !== 'draft') {
    throw new RehearsalError('Recovery or nullable coupon write did not match the contract');
  }

  return {
    bundleConflictObserved,
    concurrencySuccessCount: fulfilledCount,
    finalCourseStatus: courseRows[0].status,
    couponLinkedCount,
  };
}

async function run(mode: CourseLifecycleRehearsalMode): Promise<void> {
  const databaseUrl = process.env.COURSE_LIFECYCLE_DATABASE_URL;
  let target;
  try {
    target = parseCourseLifecycleRehearsalTarget(databaseUrl, mode);
  } catch (error) {
    throw new RehearsalError(error instanceof Error ? error.message : 'Invalid rehearsal target');
  }

  const connection = await mysql.createConnection(databaseUrl!);
  let temporaryFolder: string | undefined;
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
      throw new RehearsalError('Connected MySQL identity does not match the authorized target');
    }

    if (mode === 'inspect-upgrade') {
      console.log(JSON.stringify({
        status: 'inspected',
        mode,
        target,
        ...await inspectContract(connection, target.database),
        fixtureCounts: await fixtureCounts(connection),
      }));
      return;
    }

    if (mode === 'fresh' || mode === 'upgrade-base') {
      await assertEmptySchema(connection, target.database);
    }

    if (mode === 'upgrade-lifecycle') {
      const before = await inspectContract(connection, target.database);
      if (before.columnCount !== 0 || before.indexCount !== 0 || before.migrationCount !== 13) {
        throw new RehearsalError('Upgrade schema is not at the expected 0012 base');
      }
      await seedUpgradeFixtures(connection);
    }

    const preMigrationFixtureCounts = mode === 'upgrade-lifecycle'
      ? await fixtureCounts(connection)
      : undefined;
    if (preMigrationFixtureCounts) requireFixtureCounts(preMigrationFixtureCounts);

    const migrationsFolder = mode === 'upgrade-base'
      ? (temporaryFolder = await createUpgradeBaseFolder())
      : path.resolve(process.cwd(), 'drizzle');
    await migrate(drizzle(connection), { migrationsFolder });

    const after = await inspectContract(connection, target.database);
    const expectedMigrations = mode === 'upgrade-base' ? 13 : 14;
    const expectedObjects = mode === 'upgrade-base' ? 0 : 1;
    if (
      after.migrationCount !== expectedMigrations
      || after.columnCount !== expectedObjects
      || after.indexCount !== expectedObjects
      || after.tableCount !== 29
    ) {
      throw new RehearsalError('Migration result does not match the expected course lifecycle contract');
    }

    const postMigrationFixtureCounts = mode === 'upgrade-lifecycle'
      ? await fixtureCounts(connection)
      : undefined;
    if (postMigrationFixtureCounts) {
      requireFixtureCounts(postMigrationFixtureCounts);
      if (JSON.stringify(postMigrationFixtureCounts) !== JSON.stringify(preMigrationFixtureCounts)) {
        throw new RehearsalError('Representative fixture counts changed during migration');
      }
    }

    const behavior = mode === 'upgrade-lifecycle'
      ? await exerciseLifecycleBehavior(connection, databaseUrl!)
      : undefined;
    const finalFixtureCounts = mode === 'upgrade-lifecycle'
      ? await fixtureCounts(connection)
      : undefined;
    if (finalFixtureCounts) requireFixtureCounts(finalFixtureCounts);

    console.log(JSON.stringify({
      status: 'passed',
      mode,
      target,
      ...after,
      ...(preMigrationFixtureCounts ? { preMigrationFixtureCounts } : {}),
      ...(postMigrationFixtureCounts ? { postMigrationFixtureCounts } : {}),
      ...(finalFixtureCounts ? { finalFixtureCounts } : {}),
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
if (!isCourseLifecycleRehearsalMode(mode)) {
  console.error(
    'Usage: npm run db:rehearse:course-lifecycle -- fresh|upgrade-base|inspect-upgrade|upgrade-lifecycle',
  );
  process.exit(1);
}

run(mode).then(() => process.exit(0)).catch((error) => {
  console.error(error instanceof RehearsalError
    ? error.message
    : getSafeMigrationFailureMessage(error));
  process.exit(1);
});

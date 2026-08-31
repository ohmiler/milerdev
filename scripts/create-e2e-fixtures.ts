import { drizzle } from 'drizzle-orm/mysql2';
import mysql, { type RowDataPacket } from 'mysql2/promise';

import { E2E_FIXTURES } from '../e2e/fixtures';
import * as schema from '../src/lib/db/schema';
import {
  assertE2EFixtureDatabaseReady,
  REQUIRED_E2E_TABLES,
} from './e2e-fixture-database';
import { parseE2EFixtureTarget } from './e2e-fixture-target';

class E2EFixtureError extends Error {}

type CountRow = RowDataPacket & { count: number | string };
type IdentityRow = RowDataPacket & {
  databaseName: string | null;
  serverPort: number;
};
type TableRow = RowDataPacket & { tableName: string };

const FIXED_TIME = new Date('2026-01-15T02:00:00.000Z');

async function queryCount(
  connection: mysql.Connection,
  statement: string,
  values: unknown[] = [],
): Promise<number> {
  const [rows] = await connection.query<CountRow[]>(statement, values);
  return Number(rows[0]?.count ?? 0);
}

function quoteIdentifier(identifier: string): string {
  return `\`${identifier.replace(/`/g, '``')}\``;
}

async function inspectDatabase(
  connection: mysql.Connection,
  target: ReturnType<typeof parseE2EFixtureTarget>,
) {
  const [identityRows] = await connection.query<IdentityRow[]>(
    'SELECT DATABASE() AS databaseName, @@port AS serverPort',
  );
  const identity = identityRows[0];

  if (
    identity?.databaseName !== target.database
    || Number(identity.serverPort) !== target.port
  ) {
    return {
      databaseName: identity?.databaseName ?? null,
      serverPort: Number(identity?.serverPort ?? 0),
      migrationCount: 0,
      missingTables: [...REQUIRED_E2E_TABLES],
      existingDomainRows: 0,
    };
  }

  const [tableRows] = await connection.query<TableRow[]>(
    `SELECT table_name AS tableName
     FROM information_schema.tables
     WHERE table_schema = ? AND table_type = 'BASE TABLE'`,
    [target.database],
  );
  const tableNames = new Set(tableRows.map(({ tableName }) => tableName));
  const missingTables = REQUIRED_E2E_TABLES.filter((table) => !tableNames.has(table));
  const migrationCount = tableNames.has('__drizzle_migrations')
    ? await queryCount(connection, 'SELECT COUNT(*) AS count FROM `__drizzle_migrations`')
    : 0;
  const domainTables = [...tableNames].filter((table) => table !== '__drizzle_migrations');
  const existingDomainRows = domainTables.length === 0
    ? 0
    : await queryCount(
        connection,
        `SELECT SUM(row_count) AS count FROM (${domainTables
          .map((table) => `SELECT COUNT(*) AS row_count FROM ${quoteIdentifier(table)}`)
          .join(' UNION ALL ')}) AS domain_counts`,
      );

  return {
    databaseName: identity.databaseName,
    serverPort: Number(identity.serverPort),
    migrationCount,
    missingTables,
    existingDomainRows,
  };
}

function assertExactIds(label: string, actual: string[], expected: string[]): void {
  const normalizedActual = [...actual].sort();
  const normalizedExpected = [...expected].sort();
  if (JSON.stringify(normalizedActual) !== JSON.stringify(normalizedExpected)) {
    throw new E2EFixtureError(`${label} fixture readback did not match the manifest`);
  }
}

function createFixtureDatabase(connection: mysql.Connection) {
  return drizzle(connection, { schema, mode: 'default' });
}

async function assertFixtureReadback(
  fixtureDb: ReturnType<typeof createFixtureDatabase>,
): Promise<void> {
  const [
    seededUsers,
    seededCourses,
    seededBundles,
    seededBundleCourses,
    seededEnrollments,
    seededPayments,
    seededCertificates,
    seededSettings,
  ] = await Promise.all([
    fixtureDb.select().from(schema.users),
    fixtureDb.select().from(schema.courses),
    fixtureDb.select().from(schema.bundles),
    fixtureDb.select().from(schema.bundleCourses),
    fixtureDb.select().from(schema.enrollments),
    fixtureDb.select().from(schema.payments),
    fixtureDb.select().from(schema.certificates),
    fixtureDb.select().from(schema.settings),
  ]);

  const expectedUsers = [
    ...Object.values(E2E_FIXTURES.users),
    ...Object.values(E2E_FIXTURES.buyers),
  ];
  assertExactIds('user', seededUsers.map(({ id }) => id), expectedUsers.map(({ id }) => id));
  assertExactIds(
    'course',
    seededCourses.map(({ id }) => id),
    Object.values(E2E_FIXTURES.courses).map(({ id }) => id),
  );
  assertExactIds(
    'enrollment',
    seededEnrollments.map(({ id }) => id),
    Object.values(E2E_FIXTURES.enrollments).map(({ id }) => id),
  );
  assertExactIds(
    'payment',
    seededPayments.map(({ id }) => id),
    Object.values(E2E_FIXTURES.payments).map(({ id }) => id),
  );
  assertExactIds(
    'certificate',
    seededCertificates.map(({ id }) => id),
    Object.values(E2E_FIXTURES.certificates).map(({ id }) => id),
  );

  if (
    seededCourses.some(({ status }) => status !== 'published')
    || seededCourses.find(({ id }) => id === E2E_FIXTURES.courses.longThai.id)?.title
      !== E2E_FIXTURES.courses.longThai.title
  ) {
    throw new E2EFixtureError('Course fixture readback violated published or long-Thai state');
  }

  const bundle = seededBundles.find(({ id }) => id === E2E_FIXTURES.bundle.id);
  if (seededBundles.length !== 1 || bundle?.status !== 'published' || seededBundleCourses.length !== 2) {
    throw new E2EFixtureError('Published Bundle fixture readback did not match the manifest');
  }

  for (const payment of Object.values(E2E_FIXTURES.payments)) {
    const actual = seededPayments.find(({ id }) => id === payment.id);
    if (actual?.status !== payment.status || actual.userId !== payment.userId) {
      throw new E2EFixtureError(`Payment ${payment.status} fixture readback did not match the manifest`);
    }
  }

  const completedAccess = seededEnrollments.find(
    ({ id }) => id === E2E_FIXTURES.enrollments.paymentCompleted.id,
  );
  if (
    completedAccess?.userId !== E2E_FIXTURES.payments.completed.userId
    || Object.values(E2E_FIXTURES.payments)
      .filter(({ status }) => status !== 'completed')
      .some(({ userId }) => seededEnrollments.some((enrollment) => enrollment.userId === userId))
  ) {
    throw new E2EFixtureError('Payment access fixtures are not isolated by authoritative state');
  }

  const activeCertificate = seededCertificates.find(
    ({ id }) => id === E2E_FIXTURES.certificates.active.id,
  );
  const revokedCertificate = seededCertificates.find(
    ({ id }) => id === E2E_FIXTURES.certificates.revoked.id,
  );
  if (
    activeCertificate?.revokedAt
    || !revokedCertificate?.revokedAt
    || seededCertificates.some(
      ({ courseId }) => courseId === E2E_FIXTURES.courses.certificateMissing.id,
    )
  ) {
    throw new E2EFixtureError('Certificate state fixtures did not match active/revoked/missing');
  }

  const emptyMemberId = E2E_FIXTURES.users.emptyMember.id;
  if (
    seededEnrollments.some(({ userId }) => userId === emptyMemberId)
    || seededPayments.some(({ userId }) => userId === emptyMemberId)
    || seededCertificates.some(({ userId }) => userId === emptyMemberId)
  ) {
    throw new E2EFixtureError('Empty-data member fixture unexpectedly owns domain records');
  }

  const analyticsSetting = seededSettings.find(
    ({ key }) => key === E2E_FIXTURES.analyticsDisabled.key,
  );
  if (
    seededSettings.length !== 1
    || analyticsSetting?.value !== E2E_FIXTURES.analyticsDisabled.value
    || analyticsSetting.type !== 'boolean'
  ) {
    throw new E2EFixtureError('Analytics-disabled fixture readback did not match the manifest');
  }
}

async function seedFixtures(connection: mysql.Connection): Promise<void> {
  const fixtureDb = createFixtureDatabase(connection);
  const {
    users,
    buyers,
    courses,
    lessons,
    bundle,
    enrollments,
    payments,
    certificates,
  } = E2E_FIXTURES;

  await fixtureDb.transaction(async (tx) => {
    await tx.insert(schema.users).values(
      [...Object.values(users), ...Object.values(buyers)].map((user) => ({
        ...user,
        emailVerifiedAt: FIXED_TIME,
        createdAt: FIXED_TIME,
        updatedAt: FIXED_TIME,
      })),
    );
    await tx.insert(schema.courses).values(
      Object.values(courses).map((course) => ({
        ...course,
        status: 'published' as const,
        instructorId: users.instructor.id,
        createdAt: FIXED_TIME,
        updatedAt: FIXED_TIME,
      })),
    );
    await tx.insert(schema.lessons).values([
      { ...lessons.paid, title: 'บทเรียนคอร์สชำระเงิน E2E', content: '<p>เนื้อหาทดสอบ</p>', videoDuration: 600, orderIndex: 1, isFreePreview: false, createdAt: FIXED_TIME },
      { ...lessons.freePreview, title: 'บทเรียนทดลองฟรี E2E', content: '<p>เนื้อหาทดลองฟรี</p>', videoDuration: 300, orderIndex: 1, isFreePreview: true, createdAt: FIXED_TIME },
      { ...lessons.certificateMissing, title: 'บทเรียนใบรับรองค้าง E2E', content: '<p>เนื้อหาทดสอบ</p>', videoDuration: 480, orderIndex: 1, isFreePreview: false, createdAt: FIXED_TIME },
      { ...lessons.longThai, title: 'บทเรียนชื่อยาวภาษาไทย E2E', content: '<p>เนื้อหาทดสอบ responsive</p>', videoDuration: 420, orderIndex: 1, isFreePreview: true, createdAt: FIXED_TIME },
    ]);
    await tx.insert(schema.enrollments).values([
      { ...enrollments.active, enrolledAt: FIXED_TIME, progressPercent: 50 },
      { ...enrollments.certificateActive, enrolledAt: FIXED_TIME, progressPercent: 100, completedAt: FIXED_TIME },
      { ...enrollments.certificateRevoked, enrolledAt: FIXED_TIME, progressPercent: 100, completedAt: FIXED_TIME },
      { ...enrollments.certificateMissing, enrolledAt: FIXED_TIME, progressPercent: 100, completedAt: FIXED_TIME },
      { ...enrollments.paymentCompleted, enrolledAt: FIXED_TIME, progressPercent: 0 },
    ]);
    await tx.insert(schema.lessonProgress).values({
      id: 'e2e-progress-active',
      userId: users.learner.id,
      lessonId: lessons.paid.id,
      completed: false,
      watchTimeSeconds: 180,
      lastWatchedAt: FIXED_TIME,
    });
    await tx.insert(schema.bundles).values({
      ...bundle,
      description: 'Bundle deterministic สำหรับ required E2E',
      status: 'published',
      createdAt: FIXED_TIME,
      updatedAt: FIXED_TIME,
    });
    await tx.insert(schema.bundleCourses).values([
      { id: 'e2e-bundle-course-paid', bundleId: bundle.id, courseId: courses.paid.id, orderIndex: 0 },
      { id: 'e2e-bundle-course-free', bundleId: bundle.id, courseId: courses.free.id, orderIndex: 1 },
    ]);
    await tx.insert(schema.payments).values(
      Object.values(payments).map((payment) => ({
        ...payment,
        courseId: courses.paid.id,
        currency: 'THB',
        method: 'stripe' as const,
        stripePaymentId: `e2e-stripe-${payment.status}`,
        itemTitle: courses.paid.title,
        createdAt: FIXED_TIME,
      })),
    );
    await tx.insert(schema.certificates).values([
      {
        ...certificates.active,
        userId: users.learner.id,
        certificateCode: certificates.active.code,
        recipientName: users.learner.name,
        courseTitle: courses.longThai.title,
        completedAt: FIXED_TIME,
        issuedAt: FIXED_TIME,
      },
      {
        ...certificates.revoked,
        userId: users.learner.id,
        certificateCode: certificates.revoked.code,
        recipientName: users.learner.name,
        courseTitle: courses.free.title,
        completedAt: FIXED_TIME,
        issuedAt: FIXED_TIME,
        revokedAt: FIXED_TIME,
        revokedReason: 'เพิกถอนสำหรับสถานะทดสอบ E2E',
      },
    ]);
    await tx.insert(schema.settings).values({
      id: 'e2e-setting-analytics-disabled',
      key: E2E_FIXTURES.analyticsDisabled.key,
      value: E2E_FIXTURES.analyticsDisabled.value,
      type: 'boolean',
      description: 'Required E2E keeps optional analytics disabled',
      updatedAt: FIXED_TIME,
      updatedBy: users.instructor.id,
    });
  });

  await assertFixtureReadback(fixtureDb);
}

async function main(): Promise<void> {
  const databaseUrl = process.env.E2E_DATABASE_URL;
  let target;
  try {
    target = parseE2EFixtureTarget(databaseUrl);
  } catch (error) {
    throw new E2EFixtureError(
      error instanceof Error ? error.message : 'Invalid E2E fixture target',
    );
  }

  const connection = await mysql.createConnection(databaseUrl!);
  try {
    const state = await inspectDatabase(connection, target);
    assertE2EFixtureDatabaseReady(target, state);
    await seedFixtures(connection);

    console.log(JSON.stringify({
      status: 'created-and-verified',
      database: target.database,
      scenarioCounts: {
        users: Object.keys(E2E_FIXTURES.users).length,
        buyers: Object.keys(E2E_FIXTURES.buyers).length,
        courses: Object.keys(E2E_FIXTURES.courses).length,
        payments: Object.keys(E2E_FIXTURES.payments).length,
        certificates: Object.keys(E2E_FIXTURES.certificates).length,
      },
      canonicalCourseSlug: E2E_FIXTURES.courses.paid.slug,
    }));
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'E2E fixture creation failed');
  process.exit(1);
});

import mysql, { type RowDataPacket } from 'mysql2/promise';

import { parseCourseLifecycleSmokeTarget } from './course-lifecycle-smoke-target';

class SmokeFixtureError extends Error {}

type CountRow = RowDataPacket & { count: number | string };

const USERS = {
  admin: 'local-lifecycle-admin',
  student: 'local-lifecycle-student',
} as const;

const FIXTURES = {
  archiveCourse: 'local-course-lifecycle-archive',
  bundleCourse: 'local-course-lifecycle-bundle',
  draftCourse: 'local-course-lifecycle-draft',
  lesson: 'local-course-lifecycle-lesson',
  enrollment: 'local-course-lifecycle-enrollment',
  progress: 'local-course-lifecycle-progress',
  payment: 'local-course-lifecycle-payment',
  review: 'local-course-lifecycle-review',
  coupon: 'local-course-lifecycle-coupon',
  couponUsage: 'local-course-lifecycle-coupon-use',
  certificate: 'local-course-lifecycle-cert',
  bundle: 'local-course-lifecycle-pub-bundle',
  bundleCourseLink: 'local-course-lifecycle-bundle-link',
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
  const databaseUrl = process.env.COURSE_LIFECYCLE_SMOKE_DATABASE_URL;
  let target;
  try {
    target = parseCourseLifecycleSmokeTarget(databaseUrl);
  } catch (error) {
    throw new SmokeFixtureError(
      error instanceof Error ? error.message : 'Invalid smoke fixture target',
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

    const [tableCount, migrationCount, couponColumnCount, couponIndexCount] =
      await Promise.all([
        queryCount(
          connection,
          'SELECT COUNT(*) AS count FROM information_schema.tables WHERE table_schema = ?',
          [target.database],
        ),
        queryCount(connection, 'SELECT COUNT(*) AS count FROM `__drizzle_migrations`'),
        queryCount(
          connection,
          `SELECT COUNT(*) AS count
           FROM information_schema.columns
           WHERE table_schema = ? AND table_name = 'payments' AND column_name = 'coupon_id'`,
          [target.database],
        ),
        queryCount(
          connection,
          `SELECT COUNT(*) AS count
           FROM information_schema.statistics
           WHERE table_schema = ? AND table_name = 'payments'
             AND index_name = 'idx_payments_coupon_id'`,
          [target.database],
        ),
      ]);
    if (
      tableCount !== 29
      || migrationCount !== 14
      || couponColumnCount !== 1
      || couponIndexCount !== 1
    ) {
      throw new SmokeFixtureError(
        'Local schema is not at the expected 0013 course-lifecycle contract',
      );
    }

    const userCount = await queryCount(
      connection,
      `SELECT COUNT(*) AS count FROM users
       WHERE id IN (?, ?) AND deactivated_at IS NULL`,
      [USERS.admin, USERS.student],
    );
    const activeAdminCount = await queryCount(
      connection,
      `SELECT COUNT(*) AS count FROM users
       WHERE id = ? AND role = 'admin' AND deactivated_at IS NULL`,
      [USERS.admin],
    );
    if (userCount !== 2 || activeAdminCount !== 1) {
      throw new SmokeFixtureError(
        'Course smoke fixtures require the active local lifecycle Admin and Student fixtures',
      );
    }

    const existingCourseCount = await queryCount(
      connection,
      'SELECT COUNT(*) AS count FROM courses WHERE id IN (?, ?, ?)',
      [FIXTURES.archiveCourse, FIXTURES.bundleCourse, FIXTURES.draftCourse],
    );
    if (existingCourseCount !== 0) {
      throw new SmokeFixtureError('Course lifecycle smoke fixtures already exist');
    }

    await connection.beginTransaction();
    try {
      await connection.execute(
        `INSERT INTO courses (id, title, slug, description, price, status, instructor_id)
         VALUES
           (?, 'Lifecycle Retention Course', 'lifecycle-retention-course',
            'คอร์สสำหรับทดสอบการเก็บเข้าคลังและสิทธิ์ผู้เรียนเดิม', '100.00', 'published', ?),
           (?, 'Lifecycle Bundle Conflict Course', 'lifecycle-bundle-conflict-course',
            'คอร์สสำหรับทดสอบ Bundle conflict', '200.00', 'published', ?),
           (?, 'Lifecycle Draft Course', 'lifecycle-draft-course',
            'คอร์สสำหรับทดสอบการเผยแพร่', '0.00', 'draft', ?)`,
        [
          FIXTURES.archiveCourse, USERS.admin,
          FIXTURES.bundleCourse, USERS.admin,
          FIXTURES.draftCourse, USERS.admin,
        ],
      );
      await connection.execute(
        `INSERT INTO lessons (id, course_id, title, content, order_index)
         VALUES (?, ?, 'Retained lesson', '<p>Local smoke fixture</p>', 1)`,
        [FIXTURES.lesson, FIXTURES.archiveCourse],
      );
      await connection.execute(
        `INSERT INTO enrollments (id, user_id, course_id, progress_percent)
         VALUES (?, ?, ?, 50)`,
        [FIXTURES.enrollment, USERS.student, FIXTURES.archiveCourse],
      );
      await connection.execute(
        `INSERT INTO lesson_progress
           (id, user_id, lesson_id, completed, watch_time_seconds, last_watched_at)
         VALUES (?, ?, ?, false, 60, NOW())`,
        [FIXTURES.progress, USERS.student, FIXTURES.lesson],
      );
      await connection.execute(
        `INSERT INTO coupons
           (id, code, description, discount_type, discount_value, course_id, is_active)
         VALUES (?, 'LOCAL-COURSE-LIFECYCLE', 'Local smoke fixture',
                 'fixed', '10.00', ?, true)`,
        [FIXTURES.coupon, FIXTURES.archiveCourse],
      );
      await connection.execute(
        `INSERT INTO payments
           (id, user_id, course_id, coupon_id, amount, method, status, item_title)
         VALUES (?, ?, ?, ?, '90.00', 'promptpay', 'completed',
                 'Lifecycle Retention Course')`,
        [
          FIXTURES.payment,
          USERS.student,
          FIXTURES.archiveCourse,
          FIXTURES.coupon,
        ],
      );
      await connection.execute(
        `INSERT INTO coupon_usages
           (id, coupon_id, user_id, course_id, discount_amount)
         VALUES (?, ?, ?, ?, '10.00')`,
        [
          FIXTURES.couponUsage,
          FIXTURES.coupon,
          USERS.student,
          FIXTURES.archiveCourse,
        ],
      );
      await connection.execute(
        `INSERT INTO reviews
           (id, user_id, course_id, rating, comment, display_name, is_verified)
         VALUES (?, ?, ?, 5, 'Local smoke fixture', 'Local Lifecycle Student', true)`,
        [FIXTURES.review, USERS.student, FIXTURES.archiveCourse],
      );
      await connection.execute(
        `INSERT INTO certificates
           (id, user_id, course_id, certificate_code, recipient_name,
            course_title, completed_at)
         VALUES (?, ?, ?, 'LOCAL-LIFECYCLE', 'Local Lifecycle Student',
                 'Lifecycle Retention Course', NOW())`,
        [FIXTURES.certificate, USERS.student, FIXTURES.archiveCourse],
      );
      await connection.execute(
        `INSERT INTO bundles (id, title, slug, description, price, status)
         VALUES (?, 'Lifecycle Published Bundle', 'lifecycle-published-bundle',
                 'Bundle conflict smoke fixture', '200.00', 'published')`,
        [FIXTURES.bundle],
      );
      await connection.execute(
        `INSERT INTO bundle_courses (id, bundle_id, course_id, order_index)
         VALUES (?, ?, ?, 0)`,
        [FIXTURES.bundleCourseLink, FIXTURES.bundle, FIXTURES.bundleCourse],
      );
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    }

    console.log(JSON.stringify({
      status: 'created',
      target,
      courseCount: await queryCount(
        connection,
        'SELECT COUNT(*) AS count FROM courses WHERE id IN (?, ?, ?)',
        [FIXTURES.archiveCourse, FIXTURES.bundleCourse, FIXTURES.draftCourse],
      ),
      retainedRowCounts: {
        enrollments: await queryCount(
          connection,
          'SELECT COUNT(*) AS count FROM enrollments WHERE id = ?',
          [FIXTURES.enrollment],
        ),
        lessonProgress: await queryCount(
          connection,
          'SELECT COUNT(*) AS count FROM lesson_progress WHERE id = ?',
          [FIXTURES.progress],
        ),
        payments: await queryCount(
          connection,
          'SELECT COUNT(*) AS count FROM payments WHERE id = ?',
          [FIXTURES.payment],
        ),
        reviews: await queryCount(
          connection,
          'SELECT COUNT(*) AS count FROM reviews WHERE id = ?',
          [FIXTURES.review],
        ),
        couponUsages: await queryCount(
          connection,
          'SELECT COUNT(*) AS count FROM coupon_usages WHERE id = ?',
          [FIXTURES.couponUsage],
        ),
        certificates: await queryCount(
          connection,
          'SELECT COUNT(*) AS count FROM certificates WHERE id = ?',
          [FIXTURES.certificate],
        ),
      },
      adminEmail: 'lifecycle-admin@local.test',
      studentEmail: 'lifecycle-student@local.test',
    }));
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error instanceof SmokeFixtureError
    ? error.message
    : 'Course lifecycle smoke fixture creation failed');
  process.exit(1);
});

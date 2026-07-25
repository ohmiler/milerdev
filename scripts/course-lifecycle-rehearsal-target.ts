export type CourseLifecycleRehearsalMode =
  | 'fresh'
  | 'upgrade-base'
  | 'inspect-upgrade'
  | 'upgrade-lifecycle';

const EXPECTED_DATABASE: Record<CourseLifecycleRehearsalMode, string> = {
  fresh: 'milerdev_course_lifecycle_fresh',
  'upgrade-base': 'milerdev_course_lifecycle_upgrade',
  'inspect-upgrade': 'milerdev_course_lifecycle_upgrade',
  'upgrade-lifecycle': 'milerdev_course_lifecycle_upgrade',
};

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

export type CourseLifecycleRehearsalTarget = {
  database: string;
  hostname: string;
  port: number;
};

export function isCourseLifecycleRehearsalMode(
  value: string | undefined,
): value is CourseLifecycleRehearsalMode {
  return value === 'fresh'
    || value === 'upgrade-base'
    || value === 'inspect-upgrade'
    || value === 'upgrade-lifecycle';
}

export function parseCourseLifecycleRehearsalTarget(
  databaseUrl: string | undefined,
  mode: CourseLifecycleRehearsalMode,
): CourseLifecycleRehearsalTarget {
  if (!databaseUrl) {
    throw new Error('COURSE_LIFECYCLE_DATABASE_URL is not set');
  }

  let parsed: URL;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new Error('COURSE_LIFECYCLE_DATABASE_URL must be a valid MySQL URL');
  }

  if (parsed.protocol !== 'mysql:') {
    throw new Error('Rehearsal requires a MySQL URL');
  }

  const hostname = parsed.hostname.toLowerCase();
  if (!LOCAL_HOSTS.has(hostname)) {
    throw new Error('Rehearsal requires the local MySQL server');
  }

  const port = parsed.port === '' ? 3306 : Number(parsed.port);
  if (port !== 3306) {
    throw new Error('Rehearsal requires local MySQL port 3306');
  }

  const database = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
  if (database !== EXPECTED_DATABASE[mode]) {
    throw new Error('Rehearsal refused a protected or unauthorized schema');
  }

  return { database, hostname, port };
}

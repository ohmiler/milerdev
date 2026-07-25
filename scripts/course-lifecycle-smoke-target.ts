const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

export type CourseLifecycleSmokeTarget = {
  database: 'milerdev';
  hostname: string;
  port: 3306;
};

export function parseCourseLifecycleSmokeTarget(
  databaseUrl: string | undefined,
): CourseLifecycleSmokeTarget {
  if (!databaseUrl) {
    throw new Error('COURSE_LIFECYCLE_SMOKE_DATABASE_URL is not set');
  }

  let parsed: URL;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new Error('Smoke fixture database URL must be valid');
  }

  if (parsed.protocol !== 'mysql:') {
    throw new Error('Smoke fixtures require a MySQL URL');
  }

  const hostname = parsed.hostname.toLowerCase();
  if (!LOCAL_HOSTS.has(hostname)) {
    throw new Error('Smoke fixtures require the local MySQL server');
  }

  const port = parsed.port === '' ? 3306 : Number(parsed.port);
  if (port !== 3306) {
    throw new Error('Smoke fixtures require local MySQL port 3306');
  }

  const database = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
  if (database !== 'milerdev') {
    throw new Error('Smoke fixtures refused an unauthorized schema');
  }

  return { database, hostname, port };
}

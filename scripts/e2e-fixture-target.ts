const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);
const LOCAL_MYSQL_PORTS = new Set([3306, 3307]);

export type E2EFixtureTarget = {
  database: 'milerdev_e2e';
  hostname: string;
  port: 3306 | 3307;
};

export function parseE2EFixtureTarget(
  databaseUrl: string | undefined,
): E2EFixtureTarget {
  if (!databaseUrl) {
    throw new Error('E2E_DATABASE_URL is not set');
  }

  let parsed: URL;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new Error('E2E fixture database URL must be valid');
  }

  if (parsed.protocol !== 'mysql:') {
    throw new Error('E2E fixtures require a MySQL URL');
  }

  const hostname = parsed.hostname.toLowerCase();
  if (!LOCAL_HOSTS.has(hostname)) {
    throw new Error('E2E fixtures require a local MySQL server');
  }

  const port = parsed.port === '' ? 3306 : Number(parsed.port);
  if (!LOCAL_MYSQL_PORTS.has(port)) {
    throw new Error('E2E fixtures require local MySQL port 3306 or 3307');
  }

  const database = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
  if (database !== 'milerdev_e2e') {
    throw new Error('E2E fixtures refused an unauthorized schema');
  }

  return {
    database,
    hostname,
    port: port as 3306 | 3307,
  };
}

// Demo courses are fake products with fake reviews. They belong on a developer's own
// machine only, so the seed refuses anything that is not a loopback MySQL server.
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);

export function assertLocalDemoTarget(databaseUrl: string | undefined, nodeEnv: string | undefined): void {
  if (nodeEnv === 'production') {
    throw new Error('Demo courses are never seeded with NODE_ENV=production');
  }
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set');
  }

  let parsed: URL;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new Error('DATABASE_URL must be a valid URL');
  }

  if (parsed.protocol !== 'mysql:') {
    throw new Error('Demo courses require a MySQL database');
  }
  if (!LOOPBACK_HOSTS.has(parsed.hostname.toLowerCase())) {
    throw new Error('Demo courses are only seeded into a MySQL server on this machine (localhost)');
  }
}

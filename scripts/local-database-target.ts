// Developer tools that write fake or privileged data (demo courses, local admins) belong on a
// developer's own machine only, so they refuse anything that is not a loopback MySQL server.
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);

/** Throws unless DATABASE_URL is a MySQL server on this machine and NODE_ENV is not production. */
export function assertLocalDatabase(databaseUrl: string | undefined, nodeEnv: string | undefined, purpose: string): void {
  if (nodeEnv === 'production') {
    throw new Error(`${purpose} never runs with NODE_ENV=production`);
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
    throw new Error(`${purpose} requires a MySQL database`);
  }
  if (!LOOPBACK_HOSTS.has(parsed.hostname.toLowerCase())) {
    throw new Error(`${purpose} only runs against a MySQL server on this machine (localhost)`);
  }
}

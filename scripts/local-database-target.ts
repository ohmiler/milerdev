import { existsSync, readFileSync } from 'node:fs';

import { parse } from 'dotenv';

// Developer tools that write fake or privileged data (demo courses, local admins) belong on a
// developer's own machine only, so they refuse anything that is not a loopback MySQL server.
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);

/** "host:port/database" for a MySQL URL, without the user name or password. */
export function describeDatabase(databaseUrl: string): string {
  const url = new URL(databaseUrl);
  return `${url.hostname}:${url.port || '3306'}/${decodeURIComponent(url.pathname.slice(1))}`;
}

/** The database `npm run dev` uses: scripts/run-local-dev.cjs loads .env.local over the shell. */
export function readDevServerDatabaseUrl(envFile = '.env.local'): string | null {
  if (!existsSync(envFile)) return null;
  return parse(readFileSync(envFile)).DATABASE_URL ?? null;
}

/**
 * Scripts honor a DATABASE_URL already set in the terminal, but the dev server prefers
 * .env.local. When they differ, a script would write where the site never looks.
 */
export function databaseMismatchWarning(active: string | undefined, devServer: string | null): string | null {
  if (!active || !devServer) return null;
  try {
    if (describeDatabase(active) === describeDatabase(devServer)) return null;
    return `คำเตือน: คำสั่งนี้จะใช้ฐานข้อมูล ${describeDatabase(active)} จากตัวแปร DATABASE_URL ใน terminal `
      + `แต่เว็บที่รันด้วย npm run dev ใช้ ${describeDatabase(devServer)} จาก .env.local`;
  } catch {
    return null;
  }
}

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

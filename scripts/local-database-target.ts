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
 * Chooses the database for a local tool. Scripts used to honor a DATABASE_URL already set in
 * the terminal while the dev server prefers .env.local, so a tool could write where the site
 * never looks. On a mismatch an interactive run defaults to the dev server's database (Enter),
 * or keeps the terminal's when the person types "terminal"; a non-interactive run follows
 * `nonInteractive`.
 */
export async function chooseLocalDatabaseUrl(input: {
  envUrl: string | undefined;
  devServerUrl: string | null;
  interactive: boolean;
  ask: (question: string) => Promise<string>;
  nonInteractive: 'abort' | 'keep-terminal';
  log: (line: string) => void;
}): Promise<string | undefined> {
  const warning = databaseMismatchWarning(input.envUrl, input.devServerUrl);
  if (!warning) return input.envUrl ?? input.devServerUrl ?? undefined;
  input.log(warning);
  if (!input.interactive) {
    if (input.nonInteractive === 'keep-terminal') return input.envUrl;
    throw new Error('ยกเลิกแล้ว ไม่มีการเปลี่ยนแปลงใด ๆ ฐานข้อมูลใน terminal ไม่ตรงกับของเว็บ');
  }
  const answer = await input.ask(
    `กด Enter เพื่อใช้ฐานข้อมูลของเว็บ (${describeDatabase(input.devServerUrl!)}) `
    + `หรือพิมพ์ terminal เพื่อใช้ ${describeDatabase(input.envUrl!)}: `,
  );
  return answer.trim().toLowerCase() === 'terminal' ? input.envUrl : input.devServerUrl!;
}

/** Warns when the terminal's DATABASE_URL and .env.local's (used by `npm run dev`) differ. */
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

/**
 * Creates or updates an admin account in a LOCAL database, with a password typed in the
 * terminal (never passed on the command line, so it stays out of shell history).
 *
 *   npm run db:local-admin -- --email=you@example.com [--name="Your Name"]
 *
 * The password follows the site's policy (15–128 characters, not a known breached password).
 * Refuses any database that is not on this machine.
 */
import * as dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import readline from 'node:readline';

import { PasswordSecurityError } from '../src/lib/auth/password-errors';
import { hashNewPassword } from '../src/lib/auth/password-storage';
import * as schema from '../src/lib/db/schema';
import { parseLocalAdminArgs } from './local-admin/plan';
import { writeLocalAdmin } from './local-admin/write';
import { assertLocalDatabase } from './local-database-target';

if (!process.env.DATABASE_URL) dotenv.config({ path: '.env.local', quiet: true });

/** Asks for a value without echoing what is typed. */
function promptHidden(question: string): Promise<string> {
  if (!process.stdin.isTTY) {
    return Promise.reject(new Error('Run this in an interactive terminal so the password can be typed privately'));
  }
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  const writable = rl as unknown as { _writeToOutput: (text: string) => void };
  let muted = false;
  writable._writeToOutput = (text) => {
    if (!muted) process.stdout.write(text);
  };
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write('\n');
      resolve(answer);
    });
    muted = true;
  });
}

async function main() {
  const options = parseLocalAdminArgs(process.argv.slice(2));
  assertLocalDatabase(process.env.DATABASE_URL, process.env.NODE_ENV, 'Local admin setup');

  const password = await promptHidden('รหัสผ่านใหม่ (15–128 ตัวอักษร): ');
  const confirmation = await promptHidden('พิมพ์รหัสผ่านอีกครั้ง: ');
  if (password !== confirmation) throw new Error('รหัสผ่านสองครั้งไม่ตรงกัน ไม่มีการเปลี่ยนแปลงใด ๆ');
  const passwordHash = await hashNewPassword(password);

  const connection = await mysql.createConnection(process.env.DATABASE_URL!);
  const db = drizzle(connection, { schema, mode: 'default' });
  try {
    const write = await writeLocalAdmin(db, options, passwordHash);
    console.log(write.action === 'insert'
      ? `สร้างบัญชีแอดมิน ${options.email} แล้ว ล็อกอินด้วยรหัสผ่านที่เพิ่งตั้งได้เลย`
      : `อัปเดต ${options.email} เป็นแอดมินพร้อมรหัสผ่านใหม่แล้ว session เดิมของบัญชีนี้ถูกออกจากระบบ`);
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  if (error instanceof PasswordSecurityError) console.error(error.message);
  else console.error(error instanceof Error ? error.message : 'Local admin setup failed');
  process.exit(1);
});

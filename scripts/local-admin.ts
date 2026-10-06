/**
 * Creates or updates an admin account in a LOCAL database, with a password typed in the
 * terminal (never passed on the command line, so it stays out of shell history). Typed
 * characters show as "*", and non-English characters trigger a keyboard-layout warning.
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
import { applyMaskedInput, hasNonAsciiCharacters, initialMaskedInput } from './local-admin/masked-input';
import { parseLocalAdminArgs } from './local-admin/plan';
import { writeLocalAdmin } from './local-admin/write';
import { assertLocalDatabase } from './local-database-target';

if (!process.env.DATABASE_URL) dotenv.config({ path: '.env.local', quiet: true });

/** Asks for a password, echoing "*" per character so the length is visible but not the text. */
function promptMasked(question: string): Promise<string> {
  const stdin = process.stdin;
  if (!stdin.isTTY) {
    return Promise.reject(new Error('Run this in an interactive terminal so the password can be typed privately'));
  }
  process.stdout.write(question);
  stdin.setRawMode(true);
  stdin.setEncoding('utf8');
  stdin.resume();
  let state = initialMaskedInput;
  return new Promise((resolve, reject) => {
    const onData = (chunk: string) => {
      const result = applyMaskedInput(state, chunk);
      state = result.state;
      if (result.echo) process.stdout.write(result.echo);
      if (!state.done) return;
      stdin.off('data', onData);
      stdin.setRawMode(false);
      stdin.pause();
      process.stdout.write('\n');
      if (state.cancelled) reject(new Error('ยกเลิกแล้ว ไม่มีการเปลี่ยนแปลงใด ๆ'));
      else resolve(state.value);
    };
    stdin.on('data', onData);
  });
}

function askYes(question: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'y');
    });
  });
}

async function main() {
  const options = parseLocalAdminArgs(process.argv.slice(2));
  assertLocalDatabase(process.env.DATABASE_URL, process.env.NODE_ENV, 'Local admin setup');

  const password = await promptMasked('รหัสผ่านใหม่ (15–128 ตัวอักษร): ');
  const confirmation = await promptMasked('พิมพ์รหัสผ่านอีกครั้ง: ');
  if (password !== confirmation) throw new Error('รหัสผ่านสองครั้งไม่ตรงกัน ไม่มีการเปลี่ยนแปลงใด ๆ');
  console.log(`รับรหัสผ่านแล้ว ${[...password].length} ตัวอักษร`);
  // A password typed with a Thai keyboard layout looks fine behind "*" but will not match a login typed in English.
  if (hasNonAsciiCharacters(password)) {
    console.log('คำเตือน: รหัสผ่านมีตัวอักษรที่ไม่ใช่ภาษาอังกฤษ เช่นภาษาไทย ถ้าไม่ได้ตั้งใจ แป้นพิมพ์อาจเป็นภาษาไทยอยู่');
    if (!(await askYes('ใช้รหัสนี้ต่อไหม? พิมพ์ y เพื่อยืนยัน หรือ Enter เพื่อยกเลิก: '))) {
      throw new Error('ยกเลิกแล้ว ไม่มีการเปลี่ยนแปลงใด ๆ เปลี่ยนแป้นพิมพ์เป็นภาษาอังกฤษแล้วรันใหม่');
    }
  }
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

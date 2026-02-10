import { config } from 'dotenv';
import mysql from 'mysql2/promise';

config({ path: '.env.local' });

async function main() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL!);

  console.log('Adding certificate customization columns to courses...');

  // Add certificate_color to courses (theme name like 'blue', 'purple', etc.)
  await connection.execute(`
    ALTER TABLE courses
    ADD COLUMN IF NOT EXISTS certificate_color VARCHAR(20) DEFAULT 'blue',
    ADD COLUMN IF NOT EXISTS certificate_badge VARCHAR(50) DEFAULT NULL
  `).catch(async () => {
    // MariaDB doesn't support IF NOT EXISTS for ALTER TABLE ADD COLUMN
    try { await connection.execute(`ALTER TABLE courses ADD COLUMN certificate_color VARCHAR(20) DEFAULT 'blue'`); } catch {}
    try { await connection.execute(`ALTER TABLE courses ADD COLUMN certificate_badge VARCHAR(50) DEFAULT NULL`); } catch {}
  });

  console.log('✅ courses table updated with certificate_color and certificate_badge');

  // Add certificate_theme to certificates (snapshot at issue time)
  try {
    await connection.execute(`ALTER TABLE certificates ADD COLUMN certificate_theme VARCHAR(20) DEFAULT NULL`);
  } catch {}

  console.log('✅ certificates table updated with certificate_theme');

  await connection.end();
}

main().catch(console.error);

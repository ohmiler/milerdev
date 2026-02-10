import { config } from 'dotenv';
import mysql from 'mysql2/promise';

config({ path: '.env.local' });

async function main() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL!);

  console.log('Creating certificates table...');

  await connection.execute(`
    CREATE TABLE IF NOT EXISTS certificates (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      course_id VARCHAR(36) NOT NULL,
      certificate_code VARCHAR(20) NOT NULL UNIQUE,
      recipient_name VARCHAR(255) NOT NULL,
      course_title VARCHAR(255) NOT NULL,
      completed_at DATETIME NOT NULL,
      issued_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      revoked_at DATETIME,
      revoked_reason TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  console.log('✅ certificates table created successfully');
  await connection.end();
}

main().catch(console.error);

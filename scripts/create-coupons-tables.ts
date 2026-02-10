import { config } from 'dotenv';
import mysql from 'mysql2/promise';

config({ path: '.env.local' });

async function main() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL!);

  console.log('Creating coupons table...');
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS coupons (
      id VARCHAR(36) PRIMARY KEY,
      code VARCHAR(50) NOT NULL UNIQUE,
      description TEXT,
      discount_type VARCHAR(20) NOT NULL,
      discount_value DECIMAL(10,2) NOT NULL,
      min_purchase DECIMAL(10,2) DEFAULT 0,
      max_discount DECIMAL(10,2),
      usage_limit INT,
      usage_count INT DEFAULT 0,
      per_user_limit INT DEFAULT 1,
      course_id VARCHAR(36),
      is_active BOOLEAN DEFAULT TRUE,
      starts_at DATETIME,
      expires_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  console.log('✅ coupons table created');

  console.log('Creating coupon_usages table...');
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS coupon_usages (
      id VARCHAR(36) PRIMARY KEY,
      coupon_id VARCHAR(36) NOT NULL,
      user_id VARCHAR(36) NOT NULL,
      course_id VARCHAR(36),
      discount_amount DECIMAL(10,2) NOT NULL,
      used_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  console.log('✅ coupon_usages table created');

  await connection.end();
}

main().catch(console.error);

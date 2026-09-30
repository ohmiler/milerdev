import { hashNewPassword } from '../src/lib/password-storage';
import mysql, { RowDataPacket } from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function createAdmin() {
  const email = 'admin@milerdev.com';
  const password = process.env.INITIAL_ADMIN_PASSWORD ?? '';
  const name = 'Admin User';

  // Create connection
  const connection = await mysql.createConnection({
    host: process.env.WP_DB_HOST,
    user: process.env.WP_DB_USER,
    password: process.env.WP_DB_PASSWORD,
    database: 'course_platform',
  });

  try {
    // Check if admin exists
    const [existingAdmin] = await connection.execute<RowDataPacket[]>(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingAdmin.length > 0) {
      console.log('❌ Admin user already exists');
      return;
    }

    // Hash password
    const passwordHash = await hashNewPassword(password);

    // Create admin
    await connection.execute(
      'INSERT INTO users (id, email, name, password_hash, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
      [crypto.randomUUID(), email, name, passwordHash, 'admin']
    );

    console.log('✅ Admin user created successfully!');
    console.log(`📧 Email: ${email}`);
  } finally {
    await connection.end();
  }
}

createAdmin().catch(() => { console.error('Admin creation failed'); process.exitCode = 1; });

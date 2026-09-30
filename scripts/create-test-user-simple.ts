import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from '../src/lib/db/schema';
import { hashNewPassword } from '../src/lib/password-storage';

async function createTestUser() {
  try {
    // Parse DATABASE_URL manually
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      throw new Error('DATABASE_URL is not set');
    }

    // Extract connection details from DATABASE_URL
    const url = new URL(dbUrl);
    const config = {
      host: url.hostname,
      port: parseInt(url.port) || 3306,
      user: url.username,
      password: url.password,
      database: url.pathname.substring(1),
      connectionLimit: 10,
    };

    // Create database connection
    const connection = mysql.createPool(config);
    const db = drizzle(connection, { schema, mode: 'default' });
    
    const hashedPassword = await hashNewPassword(process.env.INITIAL_USER_PASSWORD ?? '');

    await db.insert(schema.users).values({
      email: 'user@milerdev.com',
      name: 'Test User',
      passwordHash: hashedPassword,
      role: 'student',
      emailVerifiedAt: new Date(),
    });

    console.log('✅ Test user created successfully!');
    console.log('📧 Email: user@milerdev.com');
    console.log('👤 Role: student');
  } catch {
    process.exitCode = 1;
    console.error('❌ Error creating test user:');
  } finally {
    process.exit(process.exitCode ?? 0);
  }
}

createTestUser();

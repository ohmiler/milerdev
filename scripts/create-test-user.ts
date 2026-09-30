import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from '../src/lib/db/schema';
import { hashNewPassword } from '../src/lib/password-storage';

async function createTestUser() {
  try {
    // Create database connection
    const connection = mysql.createPool(process.env.DATABASE_URL!);
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

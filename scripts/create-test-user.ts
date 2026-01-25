import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from '../src/lib/db/schema';
import { hash } from 'bcryptjs';

async function createTestUser() {
  try {
    // Create database connection
    const connection = mysql.createPool(process.env.DATABASE_URL!);
    const db = drizzle(connection, { schema, mode: 'default' });
    
    const hashedPassword = await hash('user123', 10);

    await db.insert(schema.users).values({
      email: 'user@milerdev.com',
      name: 'Test User',
      passwordHash: hashedPassword,
      role: 'student',
      emailVerifiedAt: new Date(),
    });

    console.log('✅ Test user created successfully!');
    console.log('📧 Email: user@milerdev.com');
    console.log('🔑 Password: user123');
    console.log('👤 Role: student');
  } catch (error) {
    console.error('❌ Error creating test user:', error);
  } finally {
    process.exit(0);
  }
}

createTestUser();

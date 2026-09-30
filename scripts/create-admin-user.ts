import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from '../src/lib/db/schema';
import { hashNewPassword } from '../src/lib/password-storage';

async function createAdminUser() {
  try {
    // Create database connection
    const connection = mysql.createPool(process.env.DATABASE_URL!);
    const db = drizzle(connection, { schema, mode: 'default' });
    
    const hashedPassword = await hashNewPassword(process.env.INITIAL_ADMIN_PASSWORD ?? '');

    await db.insert(schema.users).values({
      email: 'admin@milerdev.com',
      name: 'Admin User',
      passwordHash: hashedPassword,
      role: 'admin',
      emailVerifiedAt: new Date(),
    });

    console.log('✅ Admin user created successfully!');
    console.log('📧 Email: admin@milerdev.com');
    console.log('👤 Role: admin');
  } catch {
    process.exitCode = 1;
    console.error('❌ Error creating admin user:');
  } finally {
    process.exit(process.exitCode ?? 0);
  }
}

createAdminUser();

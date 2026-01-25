import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from '../src/lib/db/schema';
import { hash } from 'bcryptjs';

async function createAdminUser() {
  try {
    // Create database connection
    const connection = mysql.createPool(process.env.DATABASE_URL!);
    const db = drizzle(connection, { schema, mode: 'default' });
    
    const hashedPassword = await hash('admin123', 10);

    await db.insert(schema.users).values({
      email: 'admin@milerdev.com',
      name: 'Admin User',
      passwordHash: hashedPassword,
      role: 'admin',
      emailVerifiedAt: new Date(),
    });

    console.log('✅ Admin user created successfully!');
    console.log('📧 Email: admin@milerdev.com');
    console.log('🔑 Password: admin123');
    console.log('👤 Role: admin');
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  } finally {
    process.exit(0);
  }
}

createAdminUser();

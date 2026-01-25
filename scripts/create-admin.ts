import bcrypt from 'bcryptjs';
import { db } from '../src/lib/db';
import { users } from '../src/lib/db/schema';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function createAdmin() {
  const email = 'admin@milerdev.com';
  const password = 'admin123';
  const name = 'Admin User';

  // Check if admin exists
  const existingAdmin = await db.query.users.findFirst({
    where: (users, { eq }) => eq(users.email, email),
  });

  if (existingAdmin) {
    console.log('❌ Admin user already exists');
    return;
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 12);

  // Create admin
  await db.insert(users).values({
    email,
    name,
    passwordHash,
    role: 'admin',
  });

  console.log('✅ Admin user created successfully!');
  console.log(`📧 Email: ${email}`);
  console.log(`🔑 Password: ${password}`);
}

createAdmin().catch(console.error);

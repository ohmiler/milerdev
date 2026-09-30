import { hashNewPassword } from '../src/lib/password-storage';
import { db } from '../src/lib/db';
import { users } from '../src/lib/db/schema';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function createAdmin() {
  const email = 'admin@milerdev.com';
  const password = process.env.INITIAL_ADMIN_PASSWORD ?? '';
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
  const passwordHash = await hashNewPassword(password);

  // Create admin
  await db.insert(users).values({
    email,
    name,
    passwordHash,
    role: 'admin',
  });

  console.log('✅ Admin user created successfully!');
  console.log(`📧 Email: ${email}`);
}

createAdmin().catch(() => { console.error('Admin creation failed'); process.exitCode = 1; });

/**
 * Fix admin user role and check enrollment status.
 * 
 * Usage: npx tsx scripts/fix-admin-user.ts
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const ADMIN_EMAIL = 'misterpatipan123@gmail.com';

async function main() {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
        console.error('DATABASE_URL not set');
        process.exit(1);
    }

    const conn = await mysql.createConnection(dbUrl);
    console.log('Connected to DB\n');

    // 1. Set user role to admin
    const [result] = await conn.execute(
        "UPDATE users SET role = 'admin' WHERE email = ?",
        [ADMIN_EMAIL]
    );
    console.log(`✅ Updated ${ADMIN_EMAIL} to admin role`);
    console.log(`   Affected rows: ${(result as any).affectedRows}\n`);

    // 2. Check enrollments - show who has the most enrollments
    const [topUsers] = await conn.execute(`
        SELECT u.id, u.email, u.name, COUNT(e.id) as enrollment_count
        FROM users u
        JOIN enrollments e ON e.user_id = u.id
        GROUP BY u.id, u.email, u.name
        ORDER BY enrollment_count DESC
        LIMIT 10
    `);
    console.log('=== Top 10 Users by Enrollments ===');
    for (const u of (topUsers as any[])) {
        console.log(`  ${u.email} (${u.name}): ${u.enrollment_count} enrollments`);
    }

    // 3. Check if there's a different user with similar email
    const [similar] = await conn.execute(
        "SELECT id, email, name, role FROM users WHERE email LIKE '%misterpatipan%' OR email LIKE '%patipan%' OR name LIKE '%Patiphan%'",
    );
    console.log('\n=== Users matching patipan/patiphan ===');
    for (const u of (similar as any[])) {
        console.log(`  ${u.email} (${u.name}) - role: ${u.role} - id: ${u.id}`);
    }

    // 4. Show sample enrollments to understand the data
    const [sampleEnrollments] = await conn.execute(`
        SELECT e.user_id, u.email, c.title, e.status
        FROM enrollments e
        JOIN users u ON e.user_id = u.id
        JOIN courses c ON e.course_id = c.id
        LIMIT 5
    `);
    console.log('\n=== Sample Enrollments ===');
    for (const e of (sampleEnrollments as any[])) {
        console.log(`  ${e.email} → ${e.title} (${e.status})`);
    }

    await conn.end();
    console.log('\n✅ Done!');
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});

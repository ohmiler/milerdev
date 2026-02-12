/**
 * Check user data in Railway DB and optionally fix role.
 * 
 * Usage: npx tsx scripts/check-railway-user.ts
 * 
 * Uses DATABASE_URL from .env.local (should be Railway public URL)
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const EMAIL_TO_CHECK = 'misterpatipan123@gmail.com';

async function main() {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
        console.error('DATABASE_URL not set');
        process.exit(1);
    }

    const conn = await mysql.createConnection(dbUrl);
    console.log('Connected to DB\n');

    // 1. Check user
    const [users] = await conn.execute(
        'SELECT id, email, name, role, created_at FROM users WHERE email = ?',
        [EMAIL_TO_CHECK]
    );
    const userRows = users as any[];

    if (userRows.length === 0) {
        console.log('User not found!');
        await conn.end();
        return;
    }

    console.log('=== User ===');
    for (const u of userRows) {
        console.log(`  ID: ${u.id}`);
        console.log(`  Email: ${u.email}`);
        console.log(`  Name: ${u.name}`);
        console.log(`  Role: ${u.role}`);
        console.log(`  Created: ${u.created_at}`);
        console.log('');
    }

    // Check if there are duplicate users
    if (userRows.length > 1) {
        console.log('WARNING: Multiple users with same email!');
    }

    const userId = userRows[0].id;

    // 2. Check enrollments
    const [enrollments] = await conn.execute(
        'SELECT e.*, c.title as course_title FROM enrollments e LEFT JOIN courses c ON e.course_id = c.id WHERE e.user_id = ?',
        [userId]
    );
    const enrollRows = enrollments as any[];
    console.log(`=== Enrollments (${enrollRows.length}) ===`);
    for (const e of enrollRows) {
        console.log(`  Course: ${e.course_title} | Status: ${e.status} | Enrolled: ${e.enrolled_at}`);
    }

    // 3. Count total data
    const [totalUsers] = await conn.execute('SELECT COUNT(*) as cnt FROM users');
    const [totalEnrollments] = await conn.execute('SELECT COUNT(*) as cnt FROM enrollments');
    const [totalCourses] = await conn.execute('SELECT COUNT(*) as cnt FROM courses');
    console.log(`\n=== DB Stats ===`);
    console.log(`  Users: ${(totalUsers as any[])[0].cnt}`);
    console.log(`  Courses: ${(totalCourses as any[])[0].cnt}`);
    console.log(`  Enrollments: ${(totalEnrollments as any[])[0].cnt}`);

    // 4. Show all admin users
    const [admins] = await conn.execute("SELECT id, email, name, role FROM users WHERE role = 'admin'");
    console.log(`\n=== Admin Users ===`);
    for (const a of (admins as any[])) {
        console.log(`  ${a.email} (${a.name}) - ${a.role}`);
    }

    await conn.end();
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});

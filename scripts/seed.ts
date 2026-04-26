import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import { createId } from '@paralleldrive/cuid2';
import { hash } from 'bcryptjs';

// Load .env.local only in development
if (!process.env.DATABASE_URL) {
    dotenv.config({ path: '.env.local' });
}

async function main() {
    if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL is not set');
    }

    const connection = await mysql.createConnection(process.env.DATABASE_URL);
    const db = drizzle(connection);
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    console.log('🌱 Seeding database...\n');

    // =====================
    // 1. ADMIN USER
    // =====================
    const adminId = createId();
    const adminPassword = await hash('admin1234', 10);
    await connection.execute(
        `INSERT IGNORE INTO users (id, email, password_hash, name, role, email_verified_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [adminId, 'admin@milerdev.com', adminPassword, 'Admin MilerDev', 'admin', now, now, now]
    );
    console.log('✅ Admin user: admin@milerdev.com / admin1234');

    // =====================
    // 2. INSTRUCTOR USER
    // =====================
    const instructorId = createId();
    const instructorPassword = await hash('instructor1234', 10);
    await connection.execute(
        `INSERT IGNORE INTO users (id, email, password_hash, name, role, email_verified_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [instructorId, 'instructor@milerdev.com', instructorPassword, 'Instructor Demo', 'instructor', now, now, now]
    );
    console.log('✅ Instructor user: instructor@milerdev.com / instructor1234');

    // =====================
    // 3. STUDENT USER
    // =====================
    const studentId = createId();
    const studentPassword = await hash('student1234', 10);
    await connection.execute(
        `INSERT IGNORE INTO users (id, email, password_hash, name, role, email_verified_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [studentId, 'student@milerdev.com', studentPassword, 'Student Demo', 'student', now, now, now]
    );
    console.log('✅ Student user: student@milerdev.com / student1234');

    // =====================
    // 4. COURSES
    // =====================
    const course1Id = createId();
    const course2Id = createId();

    await connection.execute(
        `INSERT IGNORE INTO courses (id, title, slug, description, price, status, instructor_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [course1Id, 'เริ่มต้น Web Development', 'web-development-basics', 'เรียนรู้พื้นฐาน HTML, CSS, JavaScript สำหรับผู้เริ่มต้น', '0.00', 'published', instructorId, now, now]
    );

    await connection.execute(
        `INSERT IGNORE INTO courses (id, title, slug, description, price, status, instructor_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [course2Id, 'React & Next.js Masterclass', 'react-nextjs-masterclass', 'คอร์สเรียน React และ Next.js แบบเจาะลึก ตั้งแต่พื้นฐานจนถึง Production', '1990.00', 'published', instructorId, now, now]
    );
    console.log('✅ 2 courses created (1 free, 1 paid)');

    // =====================
    // 5. LESSONS
    // =====================
    const lessonsData = [
        // Course 1 lessons
        { courseId: course1Id, title: 'Web ทำงานยังไง?', order: 0, free: true },
        { courseId: course1Id, title: 'HTML พื้นฐาน', order: 1, free: true },
        { courseId: course1Id, title: 'CSS Styling เบื้องต้น', order: 2, free: false },
        { courseId: course1Id, title: 'JavaScript เบื้องต้น', order: 3, free: false },
        // Course 2 lessons
        { courseId: course2Id, title: 'ทำไมต้อง React?', order: 0, free: true },
        { courseId: course2Id, title: 'Components & Props', order: 1, free: false },
        { courseId: course2Id, title: 'State & Hooks', order: 2, free: false },
        { courseId: course2Id, title: 'Next.js App Router', order: 3, free: false },
        { courseId: course2Id, title: 'Server Components', order: 4, free: false },
        { courseId: course2Id, title: 'Deploy to Production', order: 5, free: false },
    ];

    for (const lesson of lessonsData) {
        await connection.execute(
            `INSERT IGNORE INTO lessons (id, course_id, title, content, order_index, is_free_preview, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [createId(), lesson.courseId, lesson.title, `<p>เนื้อหาบทเรียน: ${lesson.title}</p>`, lesson.order, lesson.free ? 1 : 0, now]
        );
    }
    console.log('✅ 10 lessons created');

    // =====================
    // 6. ENROLLMENT (student enrolled in free course)
    // =====================
    await connection.execute(
        `INSERT IGNORE INTO enrollments (id, user_id, course_id, enrolled_at, progress_percent)
         VALUES (?, ?, ?, ?, ?)`,
        [createId(), studentId, course1Id, now, 25]
    );
    console.log('✅ 1 enrollment (student → free course)');

    // =====================
    // 7. TAGS
    // =====================
    const tagIds: Record<string, string> = {};
    const tagsData = ['HTML', 'CSS', 'JavaScript', 'React', 'Next.js', 'TypeScript'];
    for (const tagName of tagsData) {
        const tagId = createId();
        const slug = tagName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/\./, '');
        tagIds[tagName] = tagId;
        await connection.execute(
            `INSERT IGNORE INTO tags (id, name, slug, created_at) VALUES (?, ?, ?, ?)`,
            [tagId, tagName, slug, now]
        );
    }
    console.log('✅ 6 tags created');

    // =====================
    // 8. COURSE TAGS
    // =====================
    await connection.execute(
        `INSERT IGNORE INTO course_tags (id, course_id, tag_id) VALUES (?, ?, ?)`,
        [createId(), course1Id, tagIds['HTML']]
    );
    await connection.execute(
        `INSERT IGNORE INTO course_tags (id, course_id, tag_id) VALUES (?, ?, ?)`,
        [createId(), course1Id, tagIds['CSS']]
    );
    await connection.execute(
        `INSERT IGNORE INTO course_tags (id, course_id, tag_id) VALUES (?, ?, ?)`,
        [createId(), course2Id, tagIds['React']]
    );
    await connection.execute(
        `INSERT IGNORE INTO course_tags (id, course_id, tag_id) VALUES (?, ?, ?)`,
        [createId(), course2Id, tagIds['Next.js']]
    );
    console.log('✅ Course tags linked');

    // =====================
    // 9. SETTINGS (defaults)
    // =====================
    const settingsData = [
        { key: 'site_name', value: 'MilerDev', type: 'string', desc: 'ชื่อเว็บไซต์' },
        { key: 'analytics_enabled', value: 'true', type: 'boolean', desc: 'เปิด/ปิด Analytics' },
        { key: 'maintenance_mode', value: 'false', type: 'boolean', desc: 'โหมดปิดปรับปรุง' },
    ];
    for (const s of settingsData) {
        await connection.execute(
            `INSERT IGNORE INTO settings (\`id\`, \`key\`, \`value\`, \`type\`, \`description\`, \`updated_at\`)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [createId(), s.key, s.value, s.type, s.desc, now]
        );
    }
    console.log('✅ Default settings created');

    // =====================
    // 10. BLOG POST
    // =====================
    await connection.execute(
        `INSERT IGNORE INTO blog_posts (id, title, slug, excerpt, content, status, author_id, published_at, view_count, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [createId(), 'ยินดีต้อนรับสู่ MilerDev', 'welcome-to-milerdev',
         'บทความแรกของเรา เกี่ยวกับการเรียนรู้ Web Development',
         '<p>ยินดีต้อนรับสู่ MilerDev! เราพร้อมช่วยคุณเรียนรู้การเขียนโปรแกรม</p>',
         'published', adminId, now, 0, now, now]
    );
    console.log('✅ 1 blog post created');

    // =====================
    // DONE
    // =====================
    console.log('\n🎉 Seed complete! You can now login with:');
    console.log('   Admin:      admin@milerdev.com / admin1234');
    console.log('   Instructor: instructor@milerdev.com / instructor1234');
    console.log('   Student:    student@milerdev.com / student1234');

    await connection.end();
}

main().catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
});

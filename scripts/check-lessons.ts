/* eslint-disable @typescript-eslint/no-explicit-any */
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function checkLessons() {
  const conn = await mysql.createConnection({
    host: process.env.WP_DB_HOST,
    user: process.env.WP_DB_USER,
    password: process.env.WP_DB_PASSWORD,
    database: process.env.WP_DB_NAME,
  });

  console.log('📋 Checking WordPress lessons...\n');

  // Count lessons
  const [lessonCount] = await conn.execute(`
    SELECT COUNT(*) as cnt FROM wp_posts WHERE post_type = 'sfwd-lessons'
  `);
  console.log('Total lessons:', (lessonCount as any)[0].cnt);

  // Check lesson meta keys
  const [metaKeys] = await conn.execute(`
    SELECT DISTINCT pm.meta_key, COUNT(*) as cnt
    FROM wp_postmeta pm
    JOIN wp_posts p ON pm.post_id = p.ID
    WHERE p.post_type = 'sfwd-lessons'
    GROUP BY pm.meta_key
    ORDER BY cnt DESC
    LIMIT 20
  `);
  
  console.log('\n📌 Lesson meta keys:');
  for (const mk of metaKeys as any[]) {
    console.log(`  ${mk.meta_key}: ${mk.cnt}`);
  }
  
  // Check sample lesson with course relationship
  const [sample] = await conn.execute(`
    SELECT p.ID, p.post_title, pm.meta_key, pm.meta_value
    FROM wp_posts p
    JOIN wp_postmeta pm ON p.ID = pm.post_id
    WHERE p.post_type = 'sfwd-lessons'
    AND (pm.meta_key LIKE '%course%' OR pm.meta_key LIKE '%sfwd%')
    LIMIT 15
  `);
  
  console.log('\n📚 Sample lesson course relationships:');
  for (const s of sample as any[]) {
    console.log(`  [${s.ID}] ${s.post_title.substring(0, 30)}... | ${s.meta_key} = ${String(s.meta_value).substring(0, 50)}`);
  }

  // Check if there's a course-lesson relationship table
  const [tables] = await conn.execute(`
    SHOW TABLES LIKE '%learndash%'
  `);
  console.log('\n📊 LearnDash tables:');
  for (const t of tables as any[]) {
    console.log(`  ${Object.values(t)[0]}`);
  }

  await conn.end();
}

checkLessons().catch(console.error);

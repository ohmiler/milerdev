/* eslint-disable @typescript-eslint/no-explicit-any */
import mysql, { RowDataPacket } from 'mysql2/promise';
import { createId } from '@paralleldrive/cuid2';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function migrateLessons() {
  console.log('📖 Starting lessons migration...\n');

  // Connect to WordPress DB
  const wpConn = await mysql.createConnection({
    host: process.env.WP_DB_HOST,
    user: process.env.WP_DB_USER,
    password: process.env.WP_DB_PASSWORD,
    database: process.env.WP_DB_NAME,
  });

  // Connect to new DB
  const newConn = await mysql.createConnection({
    host: process.env.WP_DB_HOST,
    user: process.env.WP_DB_USER,
    password: process.env.WP_DB_PASSWORD,
    database: 'course_platform',
  });

  try {
    // Get existing courses mapping (WordPress slug -> new course id)
    const [existingCourses] = await newConn.execute('SELECT id, slug FROM courses');
    const courseSlugToId = new Map<string, string>();
    for (const course of existingCourses as any[]) {
      courseSlugToId.set(course.slug, course.id);
    }
    console.log(`📚 Found ${courseSlugToId.size} existing courses`);

    // Get WordPress courses mapping (WordPress ID -> slug)
    const [wpCourses] = await wpConn.execute(`
      SELECT ID, post_name as slug FROM wp_posts WHERE post_type = 'sfwd-courses'
    `);
    const wpIdToSlug = new Map<number, string>();
    for (const course of wpCourses as any[]) {
      wpIdToSlug.set(course.ID, course.slug);
    }
    console.log(`📚 Found ${wpIdToSlug.size} WordPress courses`);

    // Clear existing lessons
    await newConn.execute('DELETE FROM lessons');
    console.log('🗑️ Cleared existing lessons');

    // Get lessons with course_id
    const [wpLessons] = await wpConn.execute(`
      SELECT p.ID, p.post_title, p.post_content, p.post_name, p.post_date, p.menu_order,
             pm_course.meta_value as wp_course_id,
             pm_settings.meta_value as lesson_settings
      FROM wp_posts p
      LEFT JOIN wp_postmeta pm_course ON p.ID = pm_course.post_id AND pm_course.meta_key = 'course_id'
      LEFT JOIN wp_postmeta pm_settings ON p.ID = pm_settings.post_id AND pm_settings.meta_key = '_sfwd-lessons'
      WHERE p.post_type = 'sfwd-lessons'
      ORDER BY pm_course.meta_value, p.menu_order
    `);

    console.log(`📖 Found ${(wpLessons as RowDataPacket[]).length} lessons to migrate\n`);

    let migrated = 0;
    let skipped = 0;

    for (const lesson of wpLessons as any[]) {
      // Get course slug from WordPress course ID
      const wpCourseId = parseInt(lesson.wp_course_id);
      const courseSlug = wpIdToSlug.get(wpCourseId);
      
      if (!courseSlug) {
        skipped++;
        continue;
      }

      // Get new course ID from slug
      const newCourseId = courseSlugToId.get(courseSlug);
      if (!newCourseId) {
        skipped++;
        continue;
      }

      // Parse lesson settings
      let videoUrl = null;
      let videoDuration = 0;
      let isFreePreview = false;

      if (lesson.lesson_settings) {
        const settings = lesson.lesson_settings;
        
        // Extract video URL
        const videoMatch = settings.match(/sfwd-lessons_lesson_video_url";s:\d+:"([^"]+)"/);
        if (videoMatch) videoUrl = videoMatch[1];
        
        // Extract video duration
        const durationMatch = settings.match(/sfwd-lessons_lesson_video_duration";(?:s:\d+:"|i:)(\d+)/);
        if (durationMatch) videoDuration = parseInt(durationMatch[1]) || 0;
        
        // Extract free preview
        if (settings.includes('sfwd-lessons_lesson_video_enabled";s:2:"on"')) {
          isFreePreview = true;
        }
      }

      const newId = createId();

      await newConn.execute(`
        INSERT INTO lessons (id, course_id, title, content, video_url, video_duration, order_index, is_free_preview, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        newId,
        newCourseId,
        lesson.post_title,
        lesson.post_content,
        videoUrl,
        videoDuration,
        lesson.menu_order || 0,
        isFreePreview ? 1 : 0,
        new Date(lesson.post_date),
      ]);

      migrated++;
    }

    console.log(`✅ Migrated ${migrated} lessons`);
    console.log(`⏭️ Skipped ${skipped} lessons (no valid course)`);

    // Show lessons per course
    const [lessonCounts] = await newConn.execute(`
      SELECT c.title, COUNT(l.id) as lesson_count
      FROM courses c
      LEFT JOIN lessons l ON c.id = l.course_id
      GROUP BY c.id, c.title
      ORDER BY lesson_count DESC
    `);

    console.log('\n📊 Lessons per course:');
    for (const lc of lessonCounts as any[]) {
      console.log(`  ${lc.title.substring(0, 40)}... : ${lc.lesson_count} lessons`);
    }

  } finally {
    await wpConn.end();
    await newConn.end();
  }
}

migrateLessons().catch(console.error);

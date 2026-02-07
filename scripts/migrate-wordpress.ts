/* eslint-disable @typescript-eslint/no-explicit-any */
import mysql, { RowDataPacket, Pool } from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import { createId } from '@paralleldrive/cuid2';
import { users, courses, lessons, enrollments, lessonProgress } from '../src/lib/db/schema.js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

let wpConnection: mysql.Connection;
let newConnection: Pool;
let db: any;

// ID mappings: WordPress ID -> New ID
const userIdMap = new Map<number, string>();
const courseIdMap = new Map<number, string>();
const lessonIdMap = new Map<number, string>();

async function initConnections() {
  wpConnection = await mysql.createConnection({
    host: process.env.WP_DB_HOST,
    user: process.env.WP_DB_USER,
    password: process.env.WP_DB_PASSWORD,
    database: process.env.WP_DB_NAME,
  });
  
  newConnection = mysql.createPool(process.env.DATABASE_URL!);
  db = drizzle(newConnection);
}

async function migrateUsers() {
  console.log('👥 Migrating users...');
  
  // Get users with metadata
  const wpUsers = await wpConnection.execute(`
    SELECT u.ID, u.user_email, u.user_registered, u.user_status,
           um_first.meta_value as first_name,
           um_last.meta_value as last_name,
           um_role.meta_value as role
    FROM wp_users u
    LEFT JOIN wp_usermeta um_first ON u.ID = um_first.user_id AND um_first.meta_key = 'first_name'
    LEFT JOIN wp_usermeta um_last ON u.ID = um_last.user_id AND um_last.meta_key = 'last_name'
    LEFT JOIN wp_usermeta um_role ON u.ID = um_role.user_id AND um_role.meta_key = 'wp_capabilities'
    ORDER BY u.ID
  `);

  for (const user of wpUsers[0] as any[]) {
    // Parse role from serialized data
    let role: 'student' | 'instructor' | 'admin' = 'student';
    if (user.role) {
      const roleMatch = user.role.match(/"([^"]+)"/);
      if (roleMatch) {
        role = roleMatch[1] === 'administrator' ? 'admin' : 
               roleMatch[1] === 'instructor' ? 'instructor' : 'student';
      }
    }

    const newId = createId();
    userIdMap.set(user.ID, newId);
    
    await db.insert(users).values({
      id: newId,
      email: user.user_email,
      name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || null,
      role: role,
      emailVerifiedAt: user.user_registered ? new Date(user.user_registered) : null,
      createdAt: new Date(user.user_registered),
      updatedAt: new Date(),
    });
  }

  console.log(`✅ Migrated ${(wpUsers[0] as RowDataPacket[]).length} users`);
}

async function migrateCourses() {
  console.log('📚 Migrating courses...');
  
  // Get courses (sfwd-courses post type)
  const wpCourses = await wpConnection.execute(`
    SELECT p.ID, p.post_title, p.post_content, p.post_name, p.post_status, p.post_date,
           pm_price.meta_value as price,
           pm_thumbnail.meta_value as thumbnail_id,
           pm_instructor.meta_value as instructor_id
    FROM wp_posts p
    LEFT JOIN wp_postmeta pm_price ON p.ID = pm_price.post_id AND pm_price.meta_key = '_sfwd-courses_price'
    LEFT JOIN wp_postmeta pm_thumbnail ON p.ID = pm_thumbnail.post_id AND pm_thumbnail.meta_key = '_thumbnail_id'
    LEFT JOIN wp_postmeta pm_instructor ON p.ID = pm_instructor.post_id AND pm_instructor.meta_key = '_sfwd-courses_instructor'
    WHERE p.post_type = 'sfwd-courses'
    ORDER BY p.ID
  `);

  for (const course of wpCourses[0] as any[]) {
    // Get thumbnail URL if exists
    let thumbnailUrl = null;
    if (course.thumbnail_id) {
      const thumbnail = await wpConnection.execute(`
        SELECT guid FROM wp_posts WHERE ID = ? AND post_type = 'attachment'
      `, [course.thumbnail_id]);
      if ((thumbnail[0] as RowDataPacket[]).length > 0) {
        thumbnailUrl = (thumbnail[0] as any[])[0].guid;
      }
    }

    const newId = createId();
    courseIdMap.set(course.ID, newId);
    
    // Map instructor ID if exists
    const instructorId = course.instructor_id ? userIdMap.get(parseInt(course.instructor_id)) : null;
    
    await db.insert(courses).values({
      id: newId,
      title: course.post_title,
      slug: course.post_name,
      description: course.post_content,
      thumbnailUrl: thumbnailUrl,
      price: String(parseFloat(course.price) || 0),
      status: course.post_status === 'publish' ? 'published' : 
              course.post_status === 'draft' ? 'draft' : 'archived',
      instructorId: instructorId || null,
      createdAt: new Date(course.post_date),
      updatedAt: new Date(),
    });
  }

  console.log(`✅ Migrated ${(wpCourses[0] as RowDataPacket[]).length} courses`);
}

async function migrateLessons() {
  console.log('📖 Migrating lessons...');
  
  // Get lessons (sfwd-lessons post type)
  // Using 'course_id' meta_key which is the correct key for LearnDash lessons
  const wpLessons = await wpConnection.execute(`
    SELECT p.ID, p.post_title, p.post_content, p.post_name, p.post_date, p.menu_order,
           pm_course.meta_value as course_id,
           pm_settings.meta_value as lesson_settings
    FROM wp_posts p
    LEFT JOIN wp_postmeta pm_course ON p.ID = pm_course.post_id AND pm_course.meta_key = 'course_id'
    LEFT JOIN wp_postmeta pm_settings ON p.ID = pm_settings.post_id AND pm_settings.meta_key = '_sfwd-lessons'
    WHERE p.post_type = 'sfwd-lessons'
    ORDER BY pm_course.meta_value, p.menu_order
  `);

  let skipped = 0;
  for (const lesson of wpLessons[0] as any[]) {
    // Skip lessons without valid course
    const courseId = lesson.course_id ? courseIdMap.get(parseInt(lesson.course_id)) : null;
    if (!courseId) {
      skipped++;
      continue;
    }
    
    // Parse lesson settings from serialized PHP data
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
      const freeMatch = settings.match(/sfwd-lessons_lesson_video_enabled";s:\d+:"on"/);
      if (freeMatch) isFreePreview = true;
    }
    
    const newId = createId();
    lessonIdMap.set(lesson.ID, newId);
    
    await db.insert(lessons).values({
      id: newId,
      courseId: courseId,
      title: lesson.post_title,
      content: lesson.post_content,
      videoUrl: videoUrl,
      videoDuration: videoDuration,
      orderIndex: lesson.menu_order || 0,
      isFreePreview: isFreePreview,
      createdAt: new Date(lesson.post_date),
    });
  }

  console.log(`✅ Migrated ${(wpLessons[0] as RowDataPacket[]).length - skipped} lessons (skipped ${skipped} without course)`);
}

async function migrateEnrollments() {
  console.log('📝 Migrating enrollments...');
  
  // Get enrollments from LearnDash activity
  const wpEnrollments = await wpConnection.execute(`
    SELECT DISTINCT user_id, post_id, activity_started, activity_completed
    FROM wp_learndash_user_activity
    WHERE activity_type = 'course'
    ORDER BY user_id, post_id
  `);

  let enrollSkipped = 0;
  for (const enrollment of wpEnrollments[0] as any[]) {
    const userId = userIdMap.get(enrollment.user_id);
    const courseId = courseIdMap.get(enrollment.post_id);
    
    if (!userId || !courseId) {
      enrollSkipped++;
      continue;
    }
    
    await db.insert(enrollments).values({
      userId: userId,
      courseId: courseId,
      enrolledAt: enrollment.activity_started ? new Date(enrollment.activity_started * 1000) : new Date(),
      completedAt: enrollment.activity_completed ? new Date(enrollment.activity_completed * 1000) : null,
    });
  }

  console.log(`✅ Migrated ${(wpEnrollments[0] as RowDataPacket[]).length - enrollSkipped} enrollments (skipped ${enrollSkipped})`);
}

async function migrateLessonProgress() {
  console.log('📊 Migrating lesson progress...');
  
  // Get lesson progress
  const wpProgress = await wpConnection.execute(`
    SELECT user_id, post_id, activity_started, activity_completed, activity_updated
    FROM wp_learndash_user_activity
    WHERE activity_type = 'lesson'
    ORDER BY user_id, post_id
  `);

  let progressSkipped = 0;
  for (const progress of wpProgress[0] as any[]) {
    const userId = userIdMap.get(progress.user_id);
    const lessonId = lessonIdMap.get(progress.post_id);
    
    if (!userId || !lessonId) {
      progressSkipped++;
      continue;
    }
    
    await db.insert(lessonProgress).values({
      userId: userId,
      lessonId: lessonId,
      completed: !!progress.activity_completed,
      lastWatchedAt: progress.activity_updated ? new Date(progress.activity_updated * 1000) : new Date(),
    });
  }

  console.log(`✅ Migrated ${(wpProgress[0] as RowDataPacket[]).length - progressSkipped} lesson progress (skipped ${progressSkipped})`);
}

async function main() {
  console.log('🚀 Starting WordPress migration...');
  
  try {
    await initConnections();
    await migrateUsers();
    await migrateCourses();
    await migrateLessons();
    await migrateEnrollments();
    await migrateLessonProgress();
    
    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await wpConnection.end();
    await newConnection.end();
  }
}

main();

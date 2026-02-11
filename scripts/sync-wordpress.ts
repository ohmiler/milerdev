/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Incremental WordPress Sync Script
 * 
 * Reads a fresh wordpress-export.sql and adds ONLY new users/enrollments
 * that don't already exist in the new database.
 * 
 * Usage:
 *   1. Export fresh SQL from phpMyAdmin (replace scripts/wordpress-export.sql)
 *   2. Run: npx tsx scripts/sync-wordpress.ts
 */

import fs from 'fs';
import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import { eq, and } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { users, enrollments } from '../src/lib/db/schema.js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// =====================================================
// COURSE MAPPING: WordPress course ID → New course ID
// =====================================================
const COURSE_MAP: Record<number, string> = {
  // New WP courses → New system courses (exact name match)
  1536: 'c8xec7o4s26881c79sosb8zy',  // HTML CSS Masterful
  1941: 'dubpwqqehpy7h879w4l7o9q4',  // JavaScript Mastery
  2270: 'wevl7ln1l0eqflq3y7pbera6',  // Figma to Code
  3065: 'gw8me7obdi0h5abemiodxpgp',  // ReactJS Front-End Mastery

  // Old WP courses → map to same new courses (uncomment if needed)
  // 20:  'c8xec7o4s26881c79sosb8zy',  // Modern HTML & CSS → HTML CSS Masterful
  // 237: 'dubpwqqehpy7h879w4l7o9q4',  // JavaScript for Beginners → JavaScript Mastery
  // 329: 'wevl7ln1l0eqflq3y7pbera6',  // PSD to HTML CSS JS → Figma to Code
  // 534: 'gw8me7obdi0h5abemiodxpgp',  // React Novice to Ninja → ReactJS Front-End Mastery
};

const SQL_FILE = 'scripts/wordpress-export.sql';

// =====================================================
// SQL PARSER: Extract data from SQL dump
// =====================================================

interface WpUser {
  id: number;
  email: string;
  displayName: string;
  registered: string;
}

interface WpEnrollment {
  userId: number;
  courseId: number;
  started: number | null;
  completed: number | null;
}

function parseUsersFromSQL(sql: string): WpUser[] {
  const users: WpUser[] = [];
  
  // Match INSERT INTO wp_users ... VALUES blocks
  const insertRegex = /INSERT INTO `wp_users`[\s\S]+?;/g;
  let insertMatch;
  
  while ((insertMatch = insertRegex.exec(sql)) !== null) {
    const block = insertMatch[0];
    
    // Match individual value tuples: (ID, login, pass, nicename, email, url, registered, activation_key, status, display_name)
    const tupleRegex = /\((\d+),\s*'([^']*)',\s*'([^']*)',\s*'([^']*)',\s*'([^']*)',\s*'([^']*)',\s*'([^']*)',\s*'([^']*)',\s*(\d+),\s*'([^']*)'\)/g;
    let m;
    
    while ((m = tupleRegex.exec(block)) !== null) {
      users.push({
        id: parseInt(m[1]),
        email: m[5],
        displayName: m[10],
        registered: m[7],
      });
    }
  }
  
  return users;
}

function parseEnrollmentsFromSQL(sql: string): WpEnrollment[] {
  const enrollments: WpEnrollment[] = [];
  
  // Match INSERT INTO wp_learndash_user_activity ... VALUES blocks
  const insertRegex = /INSERT INTO `wp_learndash_user_activity`[\s\S]+?;/g;
  let insertMatch;
  
  while ((insertMatch = insertRegex.exec(sql)) !== null) {
    const block = insertMatch[0];
    
    // Match tuples: (activity_id, user_id, post_id, course_id, activity_type, activity_status, activity_started, activity_completed, activity_updated)
    const tupleRegex = /\((\d+),\s*(\d+),\s*(\d+),\s*(\d+),\s*'([^']*)',\s*(\d+|NULL),\s*(\d+|NULL),\s*(\d+|NULL),\s*(\d+|NULL)\)/g;
    let m;
    
    while ((m = tupleRegex.exec(block)) !== null) {
      const activityType = m[5];
      // Use 'access' type as enrollment indicator (granted access to course)
      if (activityType === 'access') {
        const courseId = parseInt(m[4]);
        // Only include courses we care about
        if (COURSE_MAP[courseId]) {
          enrollments.push({
            userId: parseInt(m[2]),
            courseId: courseId,
            started: m[7] !== 'NULL' ? parseInt(m[7]) : null,
            completed: m[8] !== 'NULL' ? parseInt(m[8]) : null,
          });
        }
      }
    }
  }
  
  // Deduplicate by user_id + course_id
  const seen = new Set<string>();
  return enrollments.filter(e => {
    const key = `${e.userId}-${e.courseId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// =====================================================
// MAIN SYNC LOGIC
// =====================================================

async function main() {
  console.log('🔄 WordPress Incremental Sync');
  console.log('=============================\n');
  
  // 1. Read SQL file
  console.log(`📂 Reading ${SQL_FILE}...`);
  if (!fs.existsSync(SQL_FILE)) {
    console.error(`❌ File not found: ${SQL_FILE}`);
    console.error('   Export a fresh SQL dump from phpMyAdmin and place it at this path.');
    process.exit(1);
  }
  const sql = fs.readFileSync(SQL_FILE, 'utf8');
  console.log(`   File size: ${(sql.length / 1024 / 1024).toFixed(1)} MB\n`);
  
  // 2. Parse SQL data
  console.log('🔍 Parsing SQL data...');
  const wpUsers = parseUsersFromSQL(sql);
  const wpEnrollments = parseEnrollmentsFromSQL(sql);
  console.log(`   Found ${wpUsers.length} users in SQL`);
  console.log(`   Found ${wpEnrollments.length} enrollments for mapped courses\n`);
  
  // 3. Connect to new DB
  const pool = mysql.createPool(process.env.DATABASE_URL!);
  const db = drizzle(pool);
  
  // 4. Get existing users by email
  console.log('📊 Checking existing data...');
  const [existingUsers] = await pool.execute('SELECT id, email FROM users');
  const emailToId = new Map<string, string>();
  for (const u of existingUsers as any[]) {
    emailToId.set(u.email.toLowerCase(), u.id);
  }
  console.log(`   Existing users in DB: ${emailToId.size}`);
  
  // 5. Get existing enrollments
  const [existingEnrollments] = await pool.execute('SELECT user_id, course_id FROM enrollments');
  const enrollmentSet = new Set<string>();
  for (const e of existingEnrollments as any[]) {
    enrollmentSet.add(`${e.user_id}-${e.course_id}`);
  }
  console.log(`   Existing enrollments in DB: ${enrollmentSet.size}\n`);
  
  // 6. Build WP user ID → new user ID mapping
  const wpIdToNewId = new Map<number, string>();
  
  // Map existing users
  for (const wpUser of wpUsers) {
    const existingId = emailToId.get(wpUser.email.toLowerCase());
    if (existingId) {
      wpIdToNewId.set(wpUser.id, existingId);
    }
  }
  
  // 7. Add new users
  console.log('👥 Syncing users...');
  let usersAdded = 0;
  let usersSkipped = 0;
  
  for (const wpUser of wpUsers) {
    if (wpIdToNewId.has(wpUser.id)) {
      usersSkipped++;
      continue;
    }
    
    // Check for email collision (safety)
    if (emailToId.has(wpUser.email.toLowerCase())) {
      wpIdToNewId.set(wpUser.id, emailToId.get(wpUser.email.toLowerCase())!);
      usersSkipped++;
      continue;
    }
    
    const newId = createId();
    wpIdToNewId.set(wpUser.id, newId);
    emailToId.set(wpUser.email.toLowerCase(), newId);
    
    await db.insert(users).values({
      id: newId,
      email: wpUser.email,
      name: wpUser.displayName || null,
      role: 'student',
      emailVerifiedAt: wpUser.registered !== '0000-00-00 00:00:00' ? new Date(wpUser.registered) : null,
      createdAt: wpUser.registered !== '0000-00-00 00:00:00' ? new Date(wpUser.registered) : new Date(),
      updatedAt: new Date(),
    });
    
    usersAdded++;
  }
  console.log(`   ✅ Added ${usersAdded} new users (${usersSkipped} already existed)\n`);
  
  // 8. Add new enrollments
  console.log('📝 Syncing enrollments...');
  let enrollAdded = 0;
  let enrollSkipped = 0;
  let enrollNoUser = 0;
  
  for (const wpEnroll of wpEnrollments) {
    const userId = wpIdToNewId.get(wpEnroll.userId);
    const courseId = COURSE_MAP[wpEnroll.courseId];
    
    if (!userId) {
      enrollNoUser++;
      continue;
    }
    
    // Check if enrollment already exists
    const key = `${userId}-${courseId}`;
    if (enrollmentSet.has(key)) {
      enrollSkipped++;
      continue;
    }
    
    await db.insert(enrollments).values({
      id: createId(),
      userId: userId,
      courseId: courseId,
      enrolledAt: wpEnroll.started ? new Date(wpEnroll.started * 1000) : new Date(),
      completedAt: wpEnroll.completed ? new Date(wpEnroll.completed * 1000) : null,
    });
    
    enrollmentSet.add(key);
    enrollAdded++;
  }
  console.log(`   ✅ Added ${enrollAdded} new enrollments (${enrollSkipped} already existed, ${enrollNoUser} no matching user)\n`);
  
  // 9. Summary
  console.log('=============================');
  console.log('📋 Sync Summary:');
  console.log(`   Users:       +${usersAdded} new (${usersSkipped} existing)`);
  console.log(`   Enrollments: +${enrollAdded} new (${enrollSkipped} existing)`);
  console.log('=============================');
  console.log('✅ Sync completed!\n');
  
  await pool.end();
}

main().catch(err => {
  console.error('❌ Sync failed:', err);
  process.exit(1);
});

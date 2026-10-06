/**
 * Seeds realistic demo courses into a LOCAL database for development and demos.
 *
 *   npm run db:seed:demo                         replace the demo courses
 *   npm run db:seed:demo -- --enroll=you@x.com   also enroll an existing local user
 *   npm run db:seed:demo -- --remove             remove every demo row
 *
 * Refuses any database that is not on this machine. Demo rows all have ids starting with
 * "demo-", so a re-run or --remove never touches real courses, users or tags.
 */
import { createId } from '@paralleldrive/cuid2';
import * as dotenv from 'dotenv';
import { and, eq, inArray, like, notLike } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';

import * as schema from '../src/lib/db/schema';
import { DEMO_COURSES } from './demo-courses/catalog';
import { buildDemoRows, DEMO_ID_PREFIX, demoCourseId, demoTagId, demoTagSlug } from './demo-courses/rows';
import { assertLocalDemoTarget } from './demo-courses/target';

const { bundleCourses, bundles, courseSections, courseTags, courses, enrollments, lessonQuizQuestions, lessons, reviews, tags, users } = schema;
const demo = `${DEMO_ID_PREFIX}%`;

if (!process.env.DATABASE_URL) dotenv.config({ path: '.env.local' });

type Database = ReturnType<typeof drizzle<typeof schema>>;
type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];

function parseArgs(argv: string[]) {
  const remove = argv.includes('--remove');
  const enrollArg = argv.find((arg) => arg.startsWith('--enroll='));
  const unknown = argv.filter((arg) => arg !== '--remove' && !arg.startsWith('--enroll='));
  if (unknown.length > 0) throw new Error(`Unknown option: ${unknown.join(' ')}`);
  return { remove, enrollEmail: enrollArg?.slice('--enroll='.length).trim().toLowerCase() || null };
}

async function removeDemoRows(tx: Transaction) {
  // Courses cascade to sections, lessons, quizzes, attempts, progress, reviews, enrollments and links.
  await tx.delete(bundles).where(like(bundles.id, demo));
  await tx.delete(courses).where(like(courses.id, demo));
  await tx.delete(tags).where(like(tags.id, demo));
  await tx.delete(users).where(like(users.id, demo));
}

async function assertNoCollisions(tx: Transaction, rows: ReturnType<typeof buildDemoRows>) {
  const slugs = rows.courses.map((course) => course.slug);
  const taken = await tx
    .select({ slug: courses.slug })
    .from(courses)
    .where(and(inArray(courses.slug, slugs), notLike(courses.id, demo)));
  const [bundleTaken] = await tx
    .select({ id: bundles.id })
    .from(bundles)
    .where(and(eq(bundles.slug, rows.bundle.slug), notLike(bundles.id, demo)));
  const [emailTaken] = await tx
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.email, rows.instructor.email), notLike(users.id, demo)));
  const problems = [
    ...taken.map((row) => `course slug "${row.slug}"`),
    ...(bundleTaken ? [`bundle slug "${rows.bundle.slug}"`] : []),
    ...(emailTaken ? [`user email "${rows.instructor.email}"`] : []),
  ];
  if (problems.length > 0) {
    throw new Error(`Real data already uses ${problems.join(', ')}; demo courses were not seeded`);
  }
}

// Reuses a real tag with the same name, so demo courses appear under existing topic filters.
async function resolveTagIds(tx: Transaction, names: string[]) {
  const unique = [...new Set(names)];
  const existing = await tx.select({ id: tags.id, name: tags.name }).from(tags).where(inArray(tags.name, unique));
  const ids = new Map(existing.map((tag) => [tag.name, tag.id]));
  for (const name of unique) {
    if (ids.has(name)) continue;
    const slug = demoTagSlug(name);
    await tx.insert(tags).values({ id: demoTagId(slug), name, slug, createdAt: new Date() });
    ids.set(name, demoTagId(slug));
  }
  return ids;
}

async function seedDemoRows(tx: Transaction) {
  const rows = buildDemoRows(new Date());
  await assertNoCollisions(tx, rows);
  await tx.insert(users).values(rows.instructor);
  await tx.insert(courses).values(rows.courses);
  const tagIds = await resolveTagIds(tx, rows.courseTagNames.map((link) => link.tagName));
  await tx.insert(courseTags).values(rows.courseTagNames.map((link) => ({
    id: `${link.courseId}-${demoTagSlug(link.tagName)}`.slice(0, 36),
    courseId: link.courseId,
    tagId: tagIds.get(link.tagName)!,
  })));
  await tx.insert(courseSections).values(rows.sections);
  await tx.insert(lessons).values(rows.lessons);
  await tx.insert(lessonQuizQuestions).values(rows.quizQuestions);
  await tx.insert(reviews).values(rows.reviews);
  await tx.insert(bundles).values(rows.bundle);
  await tx.insert(bundleCourses).values(rows.bundleCourses);
  return rows;
}

async function enrollUser(tx: Transaction, email: string) {
  const [user] = await tx.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (!user) throw new Error(`No local user has the email ${email}; sign up first, then run again`);
  const published = DEMO_COURSES.filter((course) => course.status === 'published');
  await tx.insert(enrollments).values(published.map((course) => ({
    id: createId(),
    userId: user.id,
    courseId: demoCourseId(course.key),
    enrolledAt: new Date(),
    progressPercent: 0,
  })));
  return published.length;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  assertLocalDemoTarget(process.env.DATABASE_URL, process.env.NODE_ENV);

  const connection = await mysql.createConnection(process.env.DATABASE_URL!);
  const db = drizzle(connection, { schema, mode: 'default' });
  try {
    await db.transaction(async (tx) => {
      await removeDemoRows(tx);
      if (options.remove) {
        console.log('Removed all demo courses, lessons, reviews, tags and the demo instructor.');
        return;
      }
      const rows = await seedDemoRows(tx);
      console.log(`Seeded ${rows.courses.length} demo courses, ${rows.sections.length} sections, ${rows.lessons.length} lessons, `
        + `${rows.quizQuestions.length} quiz questions, ${rows.reviews.length} reviews and 1 bundle.`);
      if (options.enrollEmail) {
        const count = await enrollUser(tx, options.enrollEmail);
        console.log(`Enrolled ${options.enrollEmail} in ${count} published demo courses.`);
      }
    });
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Demo seed failed');
  process.exit(1);
});


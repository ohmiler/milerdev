import 'server-only';

import { and, eq, inArray } from 'drizzle-orm';

import { db } from '@/lib/db';
import { courses } from '@/lib/db/schema';
import { logError } from '@/lib/error-handler';
import { HOME_LEARNING_PATH_SLUGS } from '@/lib/home/course-plan';
import type { PathCourse } from '@/lib/learning/next-course';

/**
 * The published courses on the learning path, for the dashboard's "แนะนำต่อจากนี้" and the About page's
 * course path. A failed read is logged and returns none, so either page still renders without it.
 */
export async function getLearningPathCourses(): Promise<PathCourse[]> {
  try {
    return await db
      .select({
        title: courses.title,
        slug: courses.slug,
        thumbnailUrl: courses.thumbnailUrl,
        summary: courses.summary,
      })
      .from(courses)
      .where(and(eq(courses.status, 'published'), inArray(courses.slug, [...HOME_LEARNING_PATH_SLUGS])));
  } catch (error) {
    logError(error, { action: 'learning.path_courses.load_failed' });
    return [];
  }
}

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { courses } from '@/lib/db/schema';

type CourseSlug = string | null | undefined;

/**
 * Purge the cached public pages that render course data. Pass every slug the
 * change touched (for example both the old and new slug after a rename).
 */
export function revalidateCoursePages(...slugs: CourseSlug[]): void {
  revalidatePath('/');
  revalidatePath('/courses');
  for (const slug of new Set(slugs)) {
    if (slug) revalidatePath(`/courses/${slug}`);
  }
  revalidatePath('/sitemap.xml');
}

/** Same as revalidateCoursePages, for routes that only know the course id. */
export async function revalidateCoursePagesById(courseId: string): Promise<void> {
  const [course] = await db
    .select({ slug: courses.slug })
    .from(courses)
    .where(eq(courses.id, courseId))
    .limit(1);
  revalidateCoursePages(course?.slug);
}

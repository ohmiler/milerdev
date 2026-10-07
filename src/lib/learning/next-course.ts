import {
  describePathStep,
  HOME_LEARNING_PATH_SLUGS,
  planHomeCourses,
} from '@/lib/home/course-plan';

export type PathCourse = {
  title: string;
  slug: string;
  thumbnailUrl: string | null;
  summary: string | null;
};

export type NextCourse = PathCourse & {
  // "ขั้นที่ 3 · ต่อจาก JavaScript …", the same step label Home shows.
  step: string;
};

/**
 * The course to suggest after the member's own courses: the first step of the learning path that comes
 * after the furthest step they own, and that they do not own yet. A member with no step yet gets the
 * first one. Null when the path is not published or nothing on it lies ahead of the member.
 */
export function chooseNextCourse(
  ownedSlugs: readonly string[],
  publishedPathCourses: readonly PathCourse[],
  pathSlugs: readonly string[] = HOME_LEARNING_PATH_SLUGS,
): NextCourse | null {
  const plan = planHomeCourses(publishedPathCourses, pathSlugs);
  if (plan.mode !== 'path') return null;

  const owned = new Set(ownedSlugs);
  const furthestOwned = plan.steps.findLastIndex((course) => owned.has(course.slug));
  const index = plan.steps.findIndex((course, i) => i > furthestOwned && !owned.has(course.slug));
  if (index < 0) return null;

  return {
    ...plan.steps[index],
    step: describePathStep(index, index > 0 ? plan.steps[index - 1].title : null),
  };
}

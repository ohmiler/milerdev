// Which published courses Home shows, and in what order.

/**
 * The recommended order for a learner with no background, by course slug. Home shows it as the path, and
 * the dashboard suggests a member's next step from it. Edit this list when the catalog changes.
 * A slug that is missing or unpublished is skipped.
 */
export const HOME_LEARNING_PATH_SLUGS: readonly string[] = [
  'html-css-masterful',
  'javascript-mastery',
  'reactjs-front-end-mastery',
];

// A path needs at least two real steps; one course is not a route.
const MIN_PATH_STEPS = 2;
const LATEST_LIMIT = 4;
const EXTRA_LIMIT = 4;

export type HomeCoursePlan<T> =
  | { mode: 'path'; steps: T[]; extras: T[]; publishedCount: number }
  | { mode: 'latest'; courses: T[]; publishedCount: number };

/**
 * `published` must already be newest first. Shows the learning path when enough of it is
 * published, with every other published course as an extra; otherwise the latest courses.
 */
export function planHomeCourses<T extends { slug: string }>(
  published: readonly T[],
  pathSlugs: readonly string[] = HOME_LEARNING_PATH_SLUGS,
): HomeCoursePlan<T> {
  const bySlug = new Map(published.map((course) => [course.slug, course]));
  const steps = [...new Set(pathSlugs)]
    .map((slug) => bySlug.get(slug))
    .filter((course): course is T => course !== undefined);

  if (steps.length < MIN_PATH_STEPS) {
    return { mode: 'latest', courses: published.slice(0, LATEST_LIMIT), publishedCount: published.length };
  }

  const inPath = new Set(steps.map((course) => course.slug));
  return {
    mode: 'path',
    steps,
    extras: published.filter((course) => !inPath.has(course.slug)).slice(0, EXTRA_LIMIT),
    publishedCount: published.length,
  };
}

/** "ขั้นที่ 2 · ต่อจาก JavaScript Mastery" — the label above each step's card. */
export function describePathStep(index: number, previousTitle: string | null): string {
  return previousTitle ? `ขั้นที่ ${index + 1} · ต่อจาก ${previousTitle}` : `ขั้นที่ ${index + 1} · เริ่มที่นี่`;
}

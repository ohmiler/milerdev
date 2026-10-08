import { getExcerpt } from '@/lib/security/sanitize';

// Stripe shows this under the product name on its payment page. It is plain text there, so HTML
// entities such as "&amp;" must be decoded and block tags must leave a space between words.
const STRIPE_DESCRIPTION_LIMIT = 500;

/** The course's summary when it has one, otherwise the start of its description, as plain text. */
export function stripeCourseDescription(course: { summary?: string | null; description?: string | null }): string | undefined {
  const summary = course.summary?.trim();
  if (summary) return summary.slice(0, STRIPE_DESCRIPTION_LIMIT);
  if (!course.description) return undefined;
  // getExcerpt adds "..." when it cuts, so leave room for it.
  return getExcerpt(course.description, STRIPE_DESCRIPTION_LIMIT - 3) || undefined;
}

/** "รวม 3 คอร์ส: HTML, JavaScript, React" for a bundle (ชุดคอร์ส). */
export function stripeBundleDescription(courseTitles: string[]): string {
  return `รวม ${courseTitles.length} คอร์ส: ${courseTitles.join(', ')}`.slice(0, STRIPE_DESCRIPTION_LIMIT);
}

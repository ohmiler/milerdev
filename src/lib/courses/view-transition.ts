/**
 * The view-transition name a course cover carries on every page that shows it, so navigating
 * from a course card to the course page morphs one cover into the other.
 *
 * Slugs are free text, but a view-transition name must be a CSS identifier and must be unique on
 * a page. Every character outside [a-z0-9-] becomes its code point between underscores, so two
 * different slugs never share a name.
 */
export function courseCoverTransitionName(slug: string): string {
  const escaped = Array.from(slug, (character) =>
    /[a-z0-9-]/.test(character) ? character : `_${character.codePointAt(0)!.toString(16)}_`,
  ).join('');
  return `course-cover-${escaped}`;
}

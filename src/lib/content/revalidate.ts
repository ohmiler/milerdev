import { revalidatePath } from 'next/cache';

/** Tags appear as filters and badges on the course catalog and course pages. */
export function revalidateTagPages(): void {
  revalidatePath('/courses');
  revalidatePath('/courses/[slug]', 'page');
}

/** The course catalog lists published bundles next to courses. */
export function revalidateBundleCatalog(): void {
  revalidatePath('/courses');
}

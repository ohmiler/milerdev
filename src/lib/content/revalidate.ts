import { revalidatePath, revalidateTag } from 'next/cache';

/** Tag on the unstable_cache entries behind /blog/[slug]; path revalidation alone does not clear them. */
export const BLOG_CACHE_TAG = 'blog-posts';

/** Purge the cached blog list, every blog post page and the sitemap. */
export function revalidateBlogPages(): void {
  revalidateTag(BLOG_CACHE_TAG, { expire: 0 });
  revalidatePath('/blog');
  revalidatePath('/blog/[slug]', 'page');
  revalidatePath('/sitemap.xml');
}

/** Tags appear as filters and badges on the course and blog pages, so purge both. */
export function revalidateTagPages(): void {
  revalidatePath('/courses');
  revalidatePath('/courses/[slug]', 'page');
  revalidateBlogPages();
}

/** The course catalog lists published bundles next to courses. */
export function revalidateBundleCatalog(): void {
  revalidatePath('/courses');
}

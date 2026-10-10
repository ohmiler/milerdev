import { MetadataRoute } from 'next';
import { db } from '@/lib/db';
import { courses, bundles } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { absoluteUrl, SITE_URL } from '@/lib/content/seo';
import { chapterPath, getReadableChapters, HANDBOOK_LAUNCHED } from '@/lib/handbook/chapters';
import { logError } from '@/lib/error-handler';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: 'daily', priority: 1 },
    { url: absoluteUrl('/courses'), changeFrequency: 'daily', priority: 0.9 },
    ...(HANDBOOK_LAUNCHED ? [{ url: absoluteUrl('/handbook'), changeFrequency: 'weekly' as const, priority: 0.7 }] : []),
    { url: absoluteUrl('/about'), changeFrequency: 'monthly', priority: 0.6 },
    { url: absoluteUrl('/stack'), changeFrequency: 'monthly', priority: 0.4 },
    { url: absoluteUrl('/contact'), changeFrequency: 'monthly', priority: 0.5 },
    { url: absoluteUrl('/faq'), changeFrequency: 'monthly', priority: 0.5 },
    { url: absoluteUrl('/terms'), changeFrequency: 'yearly', priority: 0.3 },
    { url: absoluteUrl('/privacy'), changeFrequency: 'yearly', priority: 0.3 },
  ];

  let coursePages: MetadataRoute.Sitemap = [];
  let bundlePages: MetadataRoute.Sitemap = [];

  try {
    const publishedCourses = await db.select({ slug: courses.slug, createdAt: courses.createdAt, updatedAt: courses.updatedAt }).from(courses).where(eq(courses.status, 'published'));
    coursePages = publishedCourses.map((course) => ({
      url: absoluteUrl(`/courses/${course.slug}`),
      lastModified: course.updatedAt || course.createdAt || undefined,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));
  } catch (error) {
    logError(error, { action: 'sitemap.courses_failed' });
  }

  try {
    const publishedBundles = await db.select({ slug: bundles.slug, createdAt: bundles.createdAt, updatedAt: bundles.updatedAt }).from(bundles).where(eq(bundles.status, 'published'));
    bundlePages = publishedBundles.map((bundle) => ({
      url: absoluteUrl(`/bundles/${bundle.slug}`),
      lastModified: bundle.updatedAt || bundle.createdAt || undefined,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));
  } catch (error) {
    logError(error, { action: 'sitemap.bundles_failed' });
  }

  // Published handbook chapters, once the handbook is launched (ADR 0016). Drafts never appear here.
  const handbookPages: MetadataRoute.Sitemap = HANDBOOK_LAUNCHED
    ? getReadableChapters('production').map((chapter) => ({
        url: absoluteUrl(chapterPath(chapter)),
        lastModified: chapter.updatedAt ? new Date(`${chapter.updatedAt}T00:00:00+07:00`) : undefined,
        changeFrequency: 'monthly' as const,
        priority: 0.6,
      }))
    : [];

  return [...staticPages, ...handbookPages, ...coursePages, ...bundlePages];
}

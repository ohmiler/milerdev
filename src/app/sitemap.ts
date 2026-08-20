import { MetadataRoute } from 'next';
import { db } from '@/lib/db';
import { courses, bundles, blogPosts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { absoluteUrl, SITE_URL } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: 'daily', priority: 1 },
    { url: absoluteUrl('/courses'), changeFrequency: 'daily', priority: 0.9 },
    { url: absoluteUrl('/blog'), changeFrequency: 'weekly', priority: 0.8 },
    { url: absoluteUrl('/about'), changeFrequency: 'monthly', priority: 0.6 },
    { url: absoluteUrl('/contact'), changeFrequency: 'monthly', priority: 0.5 },
    { url: absoluteUrl('/faq'), changeFrequency: 'monthly', priority: 0.5 },
    { url: absoluteUrl('/terms'), changeFrequency: 'yearly', priority: 0.3 },
    { url: absoluteUrl('/privacy'), changeFrequency: 'yearly', priority: 0.3 },
  ];

  let coursePages: MetadataRoute.Sitemap = [];
  let bundlePages: MetadataRoute.Sitemap = [];
  let blogPostPages: MetadataRoute.Sitemap = [];

  try {
    const publishedCourses = await db.select({ slug: courses.slug, createdAt: courses.createdAt, updatedAt: courses.updatedAt }).from(courses).where(eq(courses.status, 'published'));
    coursePages = publishedCourses.map((course) => ({
      url: absoluteUrl(`/courses/${course.slug}`),
      lastModified: course.updatedAt || course.createdAt || undefined,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));
  } catch (error) {
    console.error('[sitemap] Failed to fetch published courses', error);
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
    console.error('[sitemap] Failed to fetch published bundles', error);
  }

  try {
    const publishedPosts = await db.select({ slug: blogPosts.slug, createdAt: blogPosts.createdAt, updatedAt: blogPosts.updatedAt }).from(blogPosts).where(eq(blogPosts.status, 'published'));
    blogPostPages = publishedPosts.map((post) => ({
      url: absoluteUrl(`/blog/${post.slug}`),
      lastModified: post.updatedAt || post.createdAt || undefined,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    }));
  } catch (error) {
    console.error('[sitemap] Failed to fetch published blog posts', error);
  }

  return [...staticPages, ...coursePages, ...bundlePages, ...blogPostPages];
}

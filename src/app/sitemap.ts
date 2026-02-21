import { MetadataRoute } from 'next';
import { db } from '@/lib/db';
import { courses, bundles, blogPosts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://milerdev.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${siteUrl}/courses`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${siteUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${siteUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${siteUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${siteUrl}/faq`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${siteUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${siteUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ];

  // Dynamic pages (may fail at build time if DB is not available)
  let coursePages: MetadataRoute.Sitemap = [];
  let bundlePages: MetadataRoute.Sitemap = [];
  let blogPostPages: MetadataRoute.Sitemap = [];

  try {
    const publishedCourses = await db
      .select({ slug: courses.slug, updatedAt: courses.updatedAt })
      .from(courses)
      .where(eq(courses.status, 'published'));

    coursePages = publishedCourses.map((course) => ({
      url: `${siteUrl}/courses/${course.slug}`,
      lastModified: course.updatedAt || new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));

    const publishedBundles = await db
      .select({ slug: bundles.slug, updatedAt: bundles.updatedAt })
      .from(bundles)
      .where(eq(bundles.status, 'published'));

    bundlePages = publishedBundles.map((bundle) => ({
      url: `${siteUrl}/bundles/${bundle.slug}`,
      lastModified: bundle.updatedAt || new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));
    const publishedPosts = await db
      .select({ slug: blogPosts.slug, updatedAt: blogPosts.updatedAt })
      .from(blogPosts)
      .where(eq(blogPosts.status, 'published'));

    blogPostPages = publishedPosts.map((post) => ({
      url: `${siteUrl}/blog/${post.slug}`,
      lastModified: post.updatedAt || new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    }));
  } catch {
    // DB not available at build time — return static pages only
  }

  return [...staticPages, ...coursePages, ...bundlePages, ...blogPostPages];
}

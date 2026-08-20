import { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/api',
          '/dashboard',
          '/settings',
          '/profile',
          '/login',
          '/register',
          '/forgot-password',
          '/reset-password',
          '/courses/*/learn',
          '/courses/*/payment-success',
          '/bundles/*/payment-success',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}

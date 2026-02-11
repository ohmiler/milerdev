import { MetadataRoute } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://milerdev.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/api/',
          '/dashboard/',
          '/settings/',
          '/profile/',
          '/login',
          '/register',
          '/forgot-password',
          '/reset-password',
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}

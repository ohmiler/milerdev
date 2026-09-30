export const DEFAULT_SITE_URL = 'https://milerdev.com';

export function getSiteUrl(rawUrl = process.env.NEXT_PUBLIC_APP_URL): string {
  const candidate = rawUrl?.trim() || DEFAULT_SITE_URL;

  try {
    const url = new URL(candidate);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return DEFAULT_SITE_URL;
    return url.origin;
  } catch {
    return DEFAULT_SITE_URL;
  }
}

export const SITE_URL = getSiteUrl();

export function absoluteUrl(path: string, baseUrl = SITE_URL): string {
  if (/^https?:\/\//i.test(path)) return path;

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return new URL(normalizedPath, `${getSiteUrl(baseUrl)}/`).toString();
}

export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

export function buildSiteJsonLd(baseUrl = SITE_URL) {
  const siteUrl = getSiteUrl(baseUrl);
  const organizationId = `${siteUrl}/#organization`;
  const websiteId = `${siteUrl}/#website`;

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': organizationId,
        name: 'MilerDev',
        url: siteUrl,
        logo: {
          '@type': 'ImageObject',
          url: `${siteUrl}/milerdev-logo-transparent.png`,
        },
      },
      {
        '@type': 'WebSite',
        '@id': websiteId,
        name: 'MilerDev',
        url: siteUrl,
        inLanguage: 'th-TH',
        publisher: { '@id': organizationId },
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${siteUrl}/courses?search={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        },
      },
    ],
  };
}

export function buildFaqPageJsonLd(items: ReadonlyArray<{ q: string; a: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    inLanguage: 'th-TH',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.a,
      },
    })),
  };
}

import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SITE_URL,
  absoluteUrl,
  buildFaqPageJsonLd,
  buildSiteJsonLd,
  getSiteUrl,
  serializeJsonLd,
} from '@/lib/seo';
import robots from '@/app/robots';

describe('SEO helpers', () => {
  it('normalizes the configured site URL to a safe origin', () => {
    expect(getSiteUrl('https://milerdev.com/')).toBe('https://milerdev.com');
    expect(getSiteUrl('http://localhost:3000/some-path')).toBe('http://localhost:3000');
    expect(getSiteUrl('javascript:alert(1)')).toBe(DEFAULT_SITE_URL);
    expect(getSiteUrl('not a URL')).toBe(DEFAULT_SITE_URL);
  });

  it('builds consistent absolute URLs', () => {
    expect(absoluteUrl('/courses/react', 'https://milerdev.com/')).toBe(
      'https://milerdev.com/courses/react',
    );
    expect(absoluteUrl('blog', 'http://localhost:3000')).toBe('http://localhost:3000/blog');
  });

  it('escapes HTML-significant characters in JSON-LD', () => {
    const serialized = serializeJsonLd({ title: '</script><script>alert(1)</script>' });

    expect(serialized).not.toContain('<');
    expect(JSON.parse(serialized)).toEqual({ title: '</script><script>alert(1)</script>' });
  });

  it('links the website schema to the canonical organization', () => {
    const schema = buildSiteJsonLd('https://milerdev.com/');

    expect(schema['@graph'][0]).toMatchObject({
      '@type': 'Organization',
      '@id': 'https://milerdev.com/#organization',
    });
    expect(schema['@graph'][1]).toMatchObject({
      '@type': 'WebSite',
      publisher: { '@id': 'https://milerdev.com/#organization' },
    });
  });

  it('maps visible FAQ answers into FAQPage schema', () => {
    const schema = buildFaqPageJsonLd([{ q: 'เริ่มเรียนอย่างไร?', a: 'เลือกคอร์สแล้วสมัครเรียน' }]);

    expect(schema.mainEntity).toEqual([
      {
        '@type': 'Question',
        name: 'เริ่มเรียนอย่างไร?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'เลือกคอร์สแล้วสมัครเรียน',
        },
      },
    ]);
  });
});

describe('robots policy', () => {
  it('keeps public content crawlable and blocks private or transactional routes', () => {
    const policy = robots();
    const rules = Array.isArray(policy.rules) ? policy.rules[0] : policy.rules;
    const disallow = Array.isArray(rules.disallow) ? rules.disallow : [rules.disallow];

    expect(rules.allow).toBe('/');
    expect(disallow).toEqual(expect.arrayContaining([
      '/admin',
      '/api',
      '/dashboard',
      '/courses/*/learn',
      '/courses/*/payment-success',
      '/bundles/*/payment-success',
    ]));
    expect(policy.sitemap).toBe('https://milerdev.com/sitemap.xml');
  });
});

import { describe, expect, it } from 'vitest';

import { metadata as aboutMetadata } from '@/app/about/page';
import { metadata as coursesMetadata } from '@/app/courses/layout';
import { metadata as blogMetadata } from '@/app/blog/layout';
import { metadata as contactMetadata } from '@/app/contact/layout';
import { metadata as faqMetadata } from '@/app/faq/layout';
import { metadata as privacyMetadata } from '@/app/privacy/layout';
import { metadata as termsMetadata } from '@/app/terms/layout';
import { DEFAULT_OG_IMAGE } from '@/lib/content/seo';

describe('public page social images', () => {
  it.each([
    ['/courses', coursesMetadata],
    ['/faq', faqMetadata],
    ['/about', aboutMetadata],
    ['/blog', blogMetadata],
    ['/contact', contactMetadata],
    ['/privacy', privacyMetadata],
    ['/terms', termsMetadata],
  ])('%s keeps an og:image and twitter:image when it overrides root metadata', (_path, metadata) => {
    expect(metadata.openGraph?.images).toEqual([DEFAULT_OG_IMAGE]);
    expect(metadata.twitter?.images).toEqual([DEFAULT_OG_IMAGE.url]);
  });

  it('uses a root-relative 1200x630 image with Thai alt text', () => {
    expect(DEFAULT_OG_IMAGE.url.startsWith('/')).toBe(true);
    expect(DEFAULT_OG_IMAGE).toMatchObject({ width: 1200, height: 630 });
    expect(DEFAULT_OG_IMAGE.alt).not.toBe('');
  });
});

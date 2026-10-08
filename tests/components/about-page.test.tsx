import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getLearningPathCourses } = vi.hoisted(() => ({ getLearningPathCourses: vi.fn() }));

vi.mock('@/lib/learning/path-courses', () => ({ getLearningPathCourses }));
vi.mock('@/components/layout/Navbar', () => ({ default: () => <div data-layout="navbar" /> }));
vi.mock('@/components/layout/Footer', () => ({ default: () => <div data-layout="footer" /> }));

import AboutPage from '@/app/about/page';
import { FOUNDER, STUDIO_PHOTOS } from '@/lib/content/founder';

const course = (slug: string, title: string) => ({ slug, title, thumbnailUrl: null, summary: `สรุป ${title}` });

describe('About page', () => {
  beforeEach(() => getLearningPathCourses.mockReset());

  it('tells the founder story with a real photo, the channel numbers and the channel links', async () => {
    getLearningPathCourses.mockResolvedValue([]);
    const html = renderToStaticMarkup(await AboutPage());

    expect(html).toContain(FOUNDER.name);
    expect(html).toContain(FOUNDER.role);
    expect(html).toContain('190,000+');
    expect(html).toContain('3,700+');
    expect(html).toContain('07-showcase');
    expect(html).toContain(`href="${FOUNDER.youtube}"`);
    expect(html).toContain(`href="${FOUNDER.facebook}"`);
    // The logo is no longer the page's main picture.
    expect(html).not.toContain('milerdev-logo-transparent');
  });

  it('gives every studio photo its own caption', async () => {
    getLearningPathCourses.mockResolvedValue([]);
    const html = renderToStaticMarkup(await AboutPage());
    const captions = STUDIO_PHOTOS.map((photo) => photo.caption);

    expect(new Set(captions).size).toBe(captions.length);
    for (const caption of captions) expect(html).toContain(caption);
  });

  it('shows the course path in order when it is published, and leaves it out when it is not', async () => {
    getLearningPathCourses.mockResolvedValue([
      course('reactjs-front-end-mastery', 'React'),
      course('html-css-masterful', 'HTML'),
      course('javascript-mastery', 'JavaScript'),
    ]);
    const html = renderToStaticMarkup(await AboutPage());

    expect(html).toContain('เส้นทางคอร์สที่แนะนำ');
    expect(html.indexOf('href="/courses/html-css-masterful"')).toBeLessThan(html.indexOf('href="/courses/javascript-mastery"'));
    expect(html.indexOf('href="/courses/javascript-mastery"')).toBeLessThan(html.indexOf('href="/courses/reactjs-front-end-mastery"'));
    expect(html).toContain('ขั้นที่ 2 · ต่อจาก HTML');

    getLearningPathCourses.mockResolvedValue([course('html-css-masterful', 'HTML')]);
    expect(renderToStaticMarkup(await AboutPage())).not.toContain('เส้นทางคอร์สที่แนะนำ');
  });
});

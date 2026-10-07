import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import CourseArtwork from '@/components/course/CourseArtwork';

const title = 'คอร์สภาษาไทยชื่อยาวสำหรับตรวจสอบการตัดบรรทัดและการจัดวางบนหน้าจอขนาดเล็ก';

describe('CourseArtwork', () => {
  it('is decorative and carries the course title with its tags', () => {
    const html = renderToStaticMarkup(<CourseArtwork title={title} slug="long-thai" tags={[{ name: 'Next.js' }]} />);

    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain(title);
    expect(html).toContain('Next.js');
    expect(html).toMatch(/MD—\d{2}/);
  });

  it('keeps only the title when compact', () => {
    const html = renderToStaticMarkup(<CourseArtwork compact title={title} slug="long-thai" tags={[{ name: 'Next.js' }]} />);

    expect(html).toContain(title);
    expect(html).not.toContain('Next.js');
    expect(html).not.toMatch(/MD—\d{2}/);
  });

  it('draws no text when bare, for a thumbnail that sits beside the title', () => {
    const html = renderToStaticMarkup(<CourseArtwork bare title={title} slug="long-thai" tags={[{ name: 'Next.js' }]} />);

    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toContain(title);
    expect(html).not.toContain('Next.js');
    expect(html).not.toMatch(/MD—\d{2}/);
  });
});

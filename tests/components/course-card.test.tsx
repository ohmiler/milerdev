import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import CourseCard from '@/components/course/CourseCard';

const baseProps = {
  id: 'course-1',
  title: 'React & Next.js Masterclass',
  slug: 'react-nextjs-masterclass',
  description: 'สร้างเว็บแอปพลิเคชันจากพื้นฐานไปจนถึงการใช้งานจริง',
  thumbnailUrl: null,
  price: 1990,
  instructorName: null,
  lessonCount: 12,
} as const;

describe('CourseCard decision evidence', () => {
  it('renders truthful optional metadata and keeps one course link', () => {
    const html = renderToStaticMarkup(
      <CourseCard
        {...baseProps}
        instructorName="Miler"
        totalDurationSeconds={5460}
        hasFreePreview
        tags={[{ id: 'tag-1', name: 'React', slug: 'react' }]}
      />,
    );

    expect(html).toContain('React');
    expect(html).toContain('1 ชม. 31 นาที');
    expect(html).toContain('มีบทเรียนทดลอง');
    expect(html).toContain('สอนโดย Miler');
    expect(html).toContain('ทดลองฟรี');
    expect(html.match(/<a\b/g)).toHaveLength(1);
  });

  it('omits unavailable evidence without adding fallback claims', () => {
    const html = renderToStaticMarkup(<CourseCard {...baseProps} />);

    expect(html).not.toContain('ชม.');
    expect(html).not.toContain('มีบทเรียนทดลอง');
    expect(html).not.toContain('สอนโดย');
    expect(html).toContain('ดูคอร์ส');
  });

  it('uses existing course data for missing media without implying a real thumbnail', () => {
    const html = renderToStaticMarkup(
      <CourseCard
        {...baseProps}
        tags={[{ id: 'tag-1', name: 'React', slug: 'react' }]}
      />,
    );

    expect(html).toContain('COURSE / REACT');
    expect(html).toContain('Learning module');
    expect(html).toContain('React &amp; Next.js Masterclass');
    expect(html).not.toContain('<img');
  });

  it('keeps the regular price in the card footer instead of covering the thumbnail', () => {
    const html = renderToStaticMarkup(<CourseCard {...baseProps} />);

    expect(html).toContain('data-slot="card-footer"');
    expect(html).toContain('aria-label="ราคา ฿1,990"');
    expect(html).toContain('฿1,990');
    expect(html).not.toContain('price-badge');
  });

  it('shows promotion evidence together in the footer', () => {
    const html = renderToStaticMarkup(
      <CourseCard
        {...baseProps}
        promoPrice={1490}
        isPromoActive
      />,
    );

    expect(html).toContain('ราคาพิเศษ ฿1,490 จาก ฿1,990 ลด 25%');
    expect(html).toContain('฿1,990');
    expect(html).toContain('ลด 25%');
  });

  it('uses a restrained free-price treatment', () => {
    const html = renderToStaticMarkup(<CourseCard {...baseProps} price={0} />);

    expect(html).toContain('aria-label="ราคา ฟรี"');
    expect(html).toContain('>ฟรี</strong>');
  });
});

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
    expect(html).toContain('ทดลองบทเรียนฟรี');
    expect(html.match(/<a\b/g)).toHaveLength(1);
  });

  it('omits unavailable evidence without adding fallback claims', () => {
    const html = renderToStaticMarkup(<CourseCard {...baseProps} />);

    expect(html).not.toContain('course-card__duration');
    expect(html).not.toContain('course-card__preview');
    expect(html).not.toContain('สอนโดย');
    expect(html).toContain('ดูรายละเอียดคอร์ส');
  });
});

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import CourseCard from '@/components/course/CourseCard';
import {
  deriveCourseDecisionFacts,
  type CourseDecisionSource,
} from '@/lib/course-decision-facts';

const NOW = new Date('2026-09-01T05:00:00.000Z');

function decisionFacts(overrides: Partial<CourseDecisionSource> = {}) {
  return deriveCourseDecisionFacts({
    slug: 'react-nextjs-masterclass',
    regularPrice: 1990,
    lessonCount: 12,
    ...overrides,
  }, { now: NOW });
}

const baseProps = {
  id: 'course-1',
  title: 'React & Next.js Masterclass',
  slug: 'react-nextjs-masterclass',
  description: 'สร้างเว็บแอปพลิเคชันจากพื้นฐานไปจนถึงการใช้งานจริง',
  thumbnailUrl: null,
  decisionFacts: decisionFacts(),
} as const;

describe('shared Home and Catalog CourseCard decision evidence', () => {
  it('renders truthful optional metadata and keeps one course link', () => {
    const html = renderToStaticMarkup(
      <CourseCard
        {...baseProps}
        decisionFacts={decisionFacts({
          instructor: { name: 'Miler' },
          knownDurationSeconds: 5460,
          freePreviewCount: 1,
          verifiedReview: { average: 4.8, count: 24 },
        })}
        tags={[{ id: 'tag-1', name: 'React', slug: 'react' }]}
      />,
    );

    expect(html).toContain('React');
    expect(html).toContain('1 ชม. 31 นาที');
    expect(html).toContain('มีบทเรียนทดลอง');
    expect(html).toContain('สอนโดย Miler');
    expect(html).toContain('4.8 · 24 รีวิว');
    expect(html).toContain('ดูรายละเอียด');
    expect(html.match(/<a\b/g)).toHaveLength(1);
  });

  it('omits unavailable evidence without adding fallback claims', () => {
    const html = renderToStaticMarkup(<CourseCard {...baseProps} />);

    expect(html).not.toContain('ชม.');
    expect(html).not.toContain('มีบทเรียนทดลอง');
    expect(html).not.toContain('สอนโดย');
    expect(html).toContain('ดูรายละเอียด');
  });

  it('uses existing course data for missing media without implying a real thumbnail', () => {
    const html = renderToStaticMarkup(
      <CourseCard
        {...baseProps}
        tags={[{ id: 'tag-1', name: 'React', slug: 'react' }]}
      />,
    );

    expect(html).toContain('>React</span>');
    expect(html).toContain('React &amp; Next.js Masterclass');
    expect(html).not.toContain('COURSE /');
    expect(html).not.toContain('Learning module');
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
        decisionFacts={decisionFacts({ promotion: { price: 1490 } })}
      />,
    );

    expect(html).toContain('ราคาพิเศษ ฿1,490 จาก ฿1,990 ลด 25%');
    expect(html).toContain('฿1,990');
    expect(html).toContain('ลด 25%');
  });

  it('uses a restrained free-price treatment', () => {
    const html = renderToStaticMarkup(
      <CourseCard {...baseProps} decisionFacts={decisionFacts({ regularPrice: 0 })} />,
    );

    expect(html).toContain('aria-label="ราคา ฟรี"');
    expect(html).toContain('>ฟรี</strong>');
  });

  it('keeps a preparing course discoverable without presenting an enrollment price', () => {
    const html = renderToStaticMarkup(
      <CourseCard {...baseProps} decisionFacts={decisionFacts({ lessonCount: 0 })} />,
    );

    expect(html).toContain('กำลังเตรียมเนื้อหา');
    expect(html).toContain('ยังไม่เปิดลงทะเบียน');
    expect(html).toContain('ดูรายละเอียด');
    expect(html).not.toContain('aria-label="ราคา');
  });
});

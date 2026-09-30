import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import BundleCourseRow from '@/components/bundle/BundleCourseRow';
import { deriveBundleDecisionFacts } from '@/lib/bundle-decision-facts';

const NOW = new Date('2026-09-02T05:00:00.000Z');

function includedCourse(overrides: {
  lessonCount?: number;
  thumbnailUrl?: string | null;
} = {}) {
  const facts = deriveBundleDecisionFacts({
    slug: 'full-stack',
    price: '1500.00',
    courses: [{
      id: 'typescript',
      title: 'TypeScript สำหรับงานจริงที่มีชื่อคอร์สภาษาไทยยาวมาก',
      slug: 'typescript',
      orderIndex: 0,
      regularPrice: '1000.00',
      promotion: { price: '800.00' },
      lessonCount: overrides.lessonCount ?? 6,
      knownDurationSeconds: 5_460,
      freePreviewCount: 2,
      instructor: { name: 'Miler' },
      verifiedReview: { average: 4.8, count: 24 },
      owned: true,
    }],
  }, { now: NOW });

  return {
    course: facts.courses[0]!,
    thumbnailUrl: overrides.thumbnailUrl ?? null,
  };
}

describe('BundleCourseRow', () => {
  it('renders the included Course state and evidence from decision facts', () => {
    const { course } = includedCourse();
    const html = renderToStaticMarkup(
      <BundleCourseRow
        course={course}
        description={'เรียนจากพื้นฐานจนทำโปรเจกต์จริง'}
        thumbnailUrl={'cdn.example.test/typescript.jpg'}
        position={1}
      />,
    );

    expect(html).toContain('พร้อมเรียน');
    expect(html).toContain('มีสิทธิ์เรียนแล้ว');
    expect(html).toContain('6 บทเรียน');
    expect(html).toContain('1 ชม. 31 นาที');
    expect(html).toContain('ทดลองเรียน 2 บท');
    expect(html).toContain('สอนโดย Miler');
    expect(html).toContain('4.8 · 24 รีวิว');
    expect(html).toContain('ราคาปัจจุบัน');
    expect(html).toContain('฿800');
    expect(html).toContain('฿1,000');
    expect(html).toContain('/courses/typescript');
    expect(html).toContain('src="https://cdn.example.test/typescript.jpg"');
    expect(html).toContain('width="640"');
    expect(html).toContain('height="360"');
    expect(html).toContain('sizes="(min-width: 1024px) 12rem, 100vw"');
    expect(html.match(/<a\b/g)).toHaveLength(1);
  });

  it('shows truthful preparing state without inventing optional evidence', () => {
    const facts = deriveBundleDecisionFacts({
      slug: 'preparing-path',
      price: '500.00',
      courses: [{
        id: 'preparing',
        title: 'คอร์สที่กำลังเตรียมบทเรียน',
        slug: 'preparing',
        orderIndex: 0,
        regularPrice: '500.00',
        lessonCount: 0,
      }],
    }, { now: NOW });

    const html = renderToStaticMarkup(
      <BundleCourseRow
        course={facts.courses[0]!}
        description={null}
        thumbnailUrl={null}
        position={1}
      />,
    );

    expect(html).toContain('กำลังเตรียมเนื้อหา');
    expect(html).not.toContain('พร้อมเรียน');
    expect(html).not.toContain('ทดลองเรียน');
    expect(html).not.toContain('สอนโดย');
    expect(html).not.toContain('รีวิว');
    expect(html.match(/<a\b/g)).toHaveLength(1);
  });
});

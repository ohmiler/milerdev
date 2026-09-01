import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import CourseDetailClient, { CourseDetailProvider } from '@/components/course/CourseDetailClient';
import { deriveCourseDecisionFacts } from '@/lib/course-decision-facts';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: null, status: 'unauthenticated' }),
}));

describe('course detail enrollment presentation', () => {
  it('does not render a purchase action for a course with no lessons', () => {
    const decisionFacts = deriveCourseDecisionFacts({
      slug: 'course-one',
      regularPrice: 1290,
      promotion: { price: 990 },
      lessonCount: 0,
    }, { now: new Date('2026-09-01T05:00:00.000Z') });
    const html = renderToStaticMarkup(
      <CourseDetailProvider>
        <CourseDetailClient
          courseId="course-1"
          courseSlug="course-one"
          decisionFacts={decisionFacts}
          renderMode="button"
        />
      </CourseDetailProvider>,
    );

    expect(html).toContain('คอร์สกำลังเตรียมเนื้อหา');
    expect(html).toContain('ยังไม่เปิดรับสมัคร');
    expect(html).not.toContain('฿990');
  });

  it('keeps the learning recovery action for an already enrolled learner', () => {
    const decisionFacts = deriveCourseDecisionFacts({
      slug: 'course-one',
      regularPrice: 1290,
      lessonCount: 0,
    }, { now: new Date('2026-09-01T05:00:00.000Z') });
    const html = renderToStaticMarkup(
      <CourseDetailProvider initialStatus="enrolled">
        <CourseDetailClient
          courseId="course-1"
          courseSlug="course-one"
          decisionFacts={decisionFacts}
          renderMode="button"
        />
      </CourseDetailProvider>,
    );

    expect(html).toContain('เข้าเรียน / เรียนต่อ');
    expect(html).toContain('href="/courses/course-one/learn"');
    expect(html).not.toContain('ยังไม่เปิดรับสมัคร');
  });
});

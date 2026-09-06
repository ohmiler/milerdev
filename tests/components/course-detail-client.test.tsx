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

  it('gives enrolled learners a learning prompt instead of a purchase prompt at the end', () => {
    const decisionFacts = deriveCourseDecisionFacts({ slug: 'react', regularPrice: 1990, lessonCount: 12 }, { now: new Date('2026-09-01T05:00:00Z') });
    const html = renderToStaticMarkup(
      <CourseDetailProvider initialStatus="enrolled">
        <CourseDetailClient courseId="react-id" courseSlug="react" decisionFacts={decisionFacts} renderMode="final-action" />
      </CourseDetailProvider>,
    );
    expect(html).toContain('กลับไปลงมือทำต่อได้เลย');
    expect(html).toContain('href="/courses/react/learn"');
    expect(html).not.toContain('พร้อมเริ่มเรียนแล้วหรือยัง');
    expect(html).not.toContain('1990');
  });

  it('keeps the final purchase prompt hidden while checking, then links visitors back to the real action', () => {
    const decisionFacts = deriveCourseDecisionFacts({ slug: 'react', regularPrice: 1990, lessonCount: 12 }, { now: new Date('2026-09-01T05:00:00Z') });
    const pending = renderToStaticMarkup(<CourseDetailProvider><CourseDetailClient courseId="react-id" courseSlug="react" decisionFacts={decisionFacts} renderMode="final-action" /></CourseDetailProvider>);
    expect(pending).toBe('');
    const visitor = renderToStaticMarkup(<CourseDetailProvider initialStatus="not-enrolled"><CourseDetailClient courseId="react-id" courseSlug="react" decisionFacts={decisionFacts} renderMode="final-action" /></CourseDetailProvider>);
    expect(visitor).toContain('พร้อมเริ่มเรียนแล้วหรือยัง?');
    expect(visitor).toContain('href="#course-action"');
    expect(visitor).not.toContain('กลับไปลงมือทำต่อได้เลย');
  });
});

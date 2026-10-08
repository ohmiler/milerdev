// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: { user: { id: 'member-1' }, expires: '2099-01-01' }, status: 'authenticated' }),
}));

import CourseDetailClient, { CourseDetailProvider } from '@/components/course/CourseDetailClient';
import { deriveCourseDecisionFacts } from '@/lib/commerce/course-decision-facts';

const decisionFacts = deriveCourseDecisionFacts({ slug: 'html-css', regularPrice: 990, lessonCount: 12 }, { now: new Date('2026-09-01T05:00:00Z') });

function answer(body: unknown) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ json: () => Promise.resolve(body) }));
}

function coursePage() {
  return render(
    <CourseDetailProvider>
      <CourseDetailClient courseId="course-1" courseSlug="html-css" decisionFacts={decisionFacts} renderMode="button" />
      <CourseDetailClient courseId="course-1" courseSlug="html-css" decisionFacts={decisionFacts} renderMode="final-action" />
    </CourseDetailProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('course page for an enrolled learner', () => {
  it('shows how far they are and the lesson that opens next, with one "เรียนต่อ" action', async () => {
    answer({
      enrolled: true,
      authenticated: true,
      learning: { progress: { completedLessons: 3, totalLessons: 12, percent: 25 }, continuation: 'resume', completed: false, nextLesson: { title: 'Flexbox', position: 4 } },
    });
    coursePage();

    expect(await screen.findByText('เรียนไปแล้ว 3 จาก 12 บท')).toBeTruthy();
    expect(screen.getByText('25%')).toBeTruthy();
    expect(screen.getByText('ต่อจาก บทที่ 4 · Flexbox')).toBeTruthy();
    const resume = screen.getAllByRole('link', { name: /^เรียนต่อ/ });
    expect(resume.length).toBeGreaterThan(0);
    for (const link of resume) expect(link.getAttribute('href')).toBe('/courses/html-css/learn');
  });

  it('offers review once the course is finished', async () => {
    answer({
      enrolled: true,
      authenticated: true,
      learning: { progress: { completedLessons: 12, totalLessons: 12, percent: 100 }, continuation: 'review', completed: true, nextLesson: null },
    });
    coursePage();

    expect(await screen.findByText('เรียนจบคอร์สนี้แล้ว')).toBeTruthy();
    expect(screen.getAllByRole('link', { name: /ทบทวนบทเรียน/ }).length).toBeGreaterThan(0);
  });

  it('keeps the plain return action when the check could not read progress', async () => {
    answer({ enrolled: true, authenticated: true, learning: null });
    coursePage();

    expect(await screen.findByText('พร้อมกลับมาเรียนต่อ?')).toBeTruthy();
    expect(screen.queryByText(/เรียนไปแล้ว/)).toBeNull();
  });
});

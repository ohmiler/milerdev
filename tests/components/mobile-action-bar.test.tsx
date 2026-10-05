// @vitest-environment jsdom

import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import CourseDetailClient, { CourseDetailProvider } from '@/components/course/CourseDetailClient';
import MobileActionBar from '@/components/layout/MobileActionBar';
import { deriveCourseDecisionFacts } from '@/lib/commerce/course-decision-facts';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock('next-auth/react', () => ({ useSession: () => ({ data: null }) }));

let notify: (isIntersecting: boolean) => void = () => {};

beforeEach(() => {
  class FakeObserver {
    constructor(callback: IntersectionObserverCallback) {
      notify = (isIntersecting) => callback([{ isIntersecting } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
    }
    observe() {}
    disconnect() {}
    unobserve() {}
    takeRecords() { return []; }
  }
  vi.stubGlobal('IntersectionObserver', FakeObserver);
  document.body.innerHTML = '<div id="course-action"></div>';
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const barProps = {
  targetId: 'course-action',
  summary: '฿1,490',
  actionLabel: 'ซื้อคอร์สนี้ ฿1,490',
  href: '#course-action',
  hiddenFrom: 'md' as const,
};

describe('MobileActionBar', () => {
  it('shows a shortcut only while the real purchase controls are off screen', () => {
    render(<MobileActionBar {...barProps} />, { container: document.body.appendChild(document.createElement('div')) });

    expect(screen.queryByRole('link', { name: 'ซื้อคอร์สนี้ ฿1,490' })).toBeNull();

    act(() => notify(false));
    const link = screen.getByRole('link', { name: 'ซื้อคอร์สนี้ ฿1,490' });
    expect(link.getAttribute('href')).toBe('#course-action');
    expect(screen.getByText('฿1,490')).toBeTruthy();

    act(() => notify(true));
    expect(screen.queryByRole('link', { name: 'ซื้อคอร์สนี้ ฿1,490' })).toBeNull();
  });

  it('is hidden from the configured breakpoint upward and does not start checkout itself', () => {
    render(<MobileActionBar {...barProps} />, { container: document.body.appendChild(document.createElement('div')) });
    act(() => notify(false));

    expect(screen.getByRole('region', { name: 'ทางลัดไปส่วนสมัครเรียน' }).className).toContain('md:hidden');
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('uses a route link for enrolled learners', () => {
    render(<MobileActionBar {...barProps} href="/courses/react/learn" actionLabel="เข้าเรียน / เรียนต่อ" />, { container: document.body.appendChild(document.createElement('div')) });
    act(() => notify(false));

    expect(screen.getByRole('link', { name: 'เข้าเรียน / เรียนต่อ' }).getAttribute('href')).toBe('/courses/react/learn');
  });
});

describe('course mobile bar mode', () => {
  const facts = (lessonCount: number) => deriveCourseDecisionFacts({
    slug: 'react',
    regularPrice: '1490',
    promotion: null,
    lessonCount,
    knownDurationSeconds: 600,
    freePreviewCount: 1,
    instructor: null,
    verifiedReview: null,
  }, { now: new Date('2026-10-01T00:00:00Z') });

  const renderBar = (decisionFacts: ReturnType<typeof facts>, initialStatus: 'checking' | 'not-enrolled' | 'enrolled') => render(
    <CourseDetailProvider initialStatus={initialStatus}>
      <CourseDetailClient courseId="c1" courseSlug="react" decisionFacts={decisionFacts} renderMode="mobile-bar" />
    </CourseDetailProvider>,
    { container: document.body.appendChild(document.createElement('div')) },
  );

  it('offers the price and acquisition label to a visitor once enrollment is resolved', () => {
    renderBar(facts(5), 'not-enrolled');
    act(() => notify(false));

    expect(screen.getByText('฿1,490')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'ซื้อคอร์สนี้ ฿1,490' }).getAttribute('href')).toBe('#course-action');
  });

  it('renders nothing while enrollment is unresolved or the course is not ready', () => {
    const checking = renderBar(facts(5), 'checking');
    act(() => notify(false));
    expect(screen.queryByRole('region')).toBeNull();
    checking.unmount();

    renderBar(facts(0), 'not-enrolled');
    act(() => notify(false));
    expect(screen.queryByRole('region')).toBeNull();
  });

  it('points enrolled learners to the learning workspace instead of a purchase', () => {
    renderBar(facts(5), 'enrolled');
    act(() => notify(false));

    expect(screen.getByRole('link', { name: /เข้าเรียน/ }).getAttribute('href')).toBe('/courses/react/learn');
    expect(screen.queryByText('฿1,490')).toBeNull();
  });
});

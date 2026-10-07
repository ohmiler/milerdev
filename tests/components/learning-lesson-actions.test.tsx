// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('next-auth/react', () => ({ useSession: () => ({ data: null }) }));
vi.mock('next/link', () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => <a href={href} {...rest}>{children}</a>,
}));
vi.mock('@/components/analytics/LearningWorkspaceAnalytics', () => ({ default: () => null }));
vi.mock('@/components/course/LearningCurriculum', () => ({ default: () => null }));
vi.mock('@/components/course/LearningNavbar', () => ({ default: () => null }));
vi.mock('@/components/ui/Toast', () => ({ showToast: vi.fn() }));
vi.mock('@/components/video/BunnyPlayer', () => ({ default: () => <div data-testid="player" /> }));

import LearnPageClient from '@/components/course/LearnPageClient';
import LessonList from '@/components/course/LessonList';

const lesson = (id: string, title: string, videoDuration: number | null) => ({
  id, title, videoDuration, isFreePreview: false, sectionId: null, sectionTitle: null,
});
const one = lesson('lesson-1', 'Flex Wrap', 371);
const two = lesson('lesson-2', 'Justify Content', null);

function renderLesson({ completed, enrolled = true }: { completed: boolean; enrolled?: boolean }) {
  return render(
    <LearnPageClient
      course={{ id: 'course-1', slug: 'html-css', title: 'HTML CSS Masterful' }}
      currentLesson={{ ...one, content: null, videoUrl: 'https://iframe.mediadelivery.net/embed/123/video-one' }}
      allLessons={[one, two]}
      prevLesson={null}
      nextLesson={two}
      currentIndex={0}
      isEnrolled={enrolled}
      canTrackProgress={enrolled}
      completedLessonIds={completed ? ['lesson-1'] : []}
      currentProgress={{ completed, watchTimeSeconds: 0 }}
    />,
  );
}

// The link to the next lesson, whatever its small label says.
const nextLink = () => screen.getByRole('link', { name: /Justify Content/ });

describe('end of a lesson', () => {
  beforeEach(() => { vi.stubGlobal('fetch', vi.fn()); });
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

  it('keeps saving as the one primary action until the lesson is finished, and says that moving on skips it', () => {
    renderLesson({ completed: false });

    expect(screen.getByRole('button', { name: 'เรียนจบ แล้วไปบทถัดไป' }).getAttribute('data-variant')).toBe('default');
    expect(nextLink().textContent).toContain('ข้ามไปบทถัดไป');
    expect(nextLink().getAttribute('data-variant')).toBe('outline');
  });

  it('makes the next lesson the primary action once this one is saved', () => {
    renderLesson({ completed: true });

    expect(screen.queryByRole('button', { name: 'เรียนจบ แล้วไปบทถัดไป' })).toBeNull();
    expect(nextLink().textContent).not.toContain('ข้าม');
    expect(nextLink().getAttribute('data-variant')).toBe('default');
  });

  it('leaves the price as the primary action in a free preview', () => {
    renderLesson({ completed: false, enrolled: false });

    expect(screen.getByRole('link', { name: 'ดูราคาและวิธีเข้าเรียน' }).getAttribute('data-variant')).toBe('default');
    // A locked next lesson opens the sign-up dialog, and stays secondary.
    expect(screen.getByRole('button', { name: /Justify Content/ }).getAttribute('data-variant')).toBe('secondary');
  });
});

describe('lesson list rows', () => {
  beforeEach(() => { Element.prototype.scrollIntoView = vi.fn(); });
  afterEach(cleanup);

  it('shows a clip length when there is one, and nothing in place of a missing one', () => {
    render(<LessonList lessons={[one, two]} courseSlug="html-css" isEnrolled />);

    expect(screen.getByRole('link', { name: /Flex Wrap/ }).textContent).toContain('6:11');
    // The badge already says 02; the row does not repeat it as "บทที่ 2".
    expect(screen.getByRole('link', { name: /Justify Content/ }).textContent).not.toContain('บทที่');
  });
});

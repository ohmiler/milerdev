// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import CourseLessonList from '@/components/course/CourseLessonList';
import LessonList from '@/components/course/LessonList';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('next-auth/react', () => ({ useSession: () => ({ data: null }) }));

beforeEach(() => { Element.prototype.scrollIntoView = vi.fn(); });
afterEach(cleanup);

// 25 lessons: one intro lesson without a section, then "Basics" (1-21) and "Project" (22-24).
const lessons = Array.from({ length: 25 }, (_, index) => ({
  id: `lesson-${index}`,
  title: `บทที่ ${index + 1}`,
  videoDuration: 60,
  isFreePreview: true,
  sectionId: index === 0 ? null : index < 22 ? 'basics' : 'project',
  sectionTitle: index === 0 ? null : index < 22 ? 'พื้นฐาน' : 'โปรเจกต์',
}));

describe('curriculum sections', () => {
  it('heads each section in the learning sidebar and continues numbering across pages', () => {
    render(<LessonList lessons={lessons} courseSlug="course" currentLessonId="lesson-23" />);
    // The current lesson is on page 2, which starts inside "Basics" and moves on to "Project".
    expect(screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual(['พื้นฐาน', 'โปรเจกต์']);
    expect(screen.getAllByRole('link')[0].getAttribute('href')).toContain('lesson-20');
    expect(within(screen.getByRole('link', { current: 'page' })).getByText('24')).toBeTruthy();
  });

  it('drops section headings while searching so results read as one list', () => {
    render(<LessonList lessons={lessons} courseSlug="course" searchQuery="บทที่ 2" />);
    expect(screen.queryAllByRole('heading')).toHaveLength(0);
    expect(screen.getAllByRole('link').length).toBeGreaterThan(0);
  });

  it('keeps the flat list for courses without sections', () => {
    const flat = lessons.map((lesson) => ({ ...lesson, sectionId: null, sectionTitle: null }));
    render(<LessonList lessons={flat} courseSlug="course" />);
    expect(screen.queryAllByRole('heading')).toHaveLength(0);
  });

  it('heads sections on the public course page with each section\'s full lesson count', () => {
    render(<CourseLessonList lessons={lessons} courseSlug="course" courseId="course-1" />);
    // Only the first 10 lessons are shown, but the heading counts the whole section.
    expect(screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual(['พื้นฐาน21 บท']);
    expect(screen.getAllByRole('listitem')).toHaveLength(10);
  });
});

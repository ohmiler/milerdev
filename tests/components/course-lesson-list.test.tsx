// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CourseLessonList from '@/components/course/CourseLessonList';

const push = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('next-auth/react', () => ({ useSession: () => ({ data: null }) }));

afterEach(() => { cleanup(); vi.clearAllMocks(); });

const lessons = Array.from({ length: 12 }, (_, index) => ({
  id: `lesson-${index + 1}`,
  title: `หัวข้อ ${index + 1}`,
  videoDuration: 60,
  isFreePreview: index === 1 || index === 11,
}));

describe('course curriculum', () => {
  it('shows every free preview, retains its course position and restores the full list', async () => {
    const user = userEvent.setup();
    render(<CourseLessonList lessons={lessons} courseSlug="react" courseId="course-one" />);
    expect(screen.getAllByRole('listitem')).toHaveLength(10);
    await user.click(screen.getByRole('button', { name: /ดูเฉพาะ.*บทฟรี/ }));
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    const lastPreview = screen.getByRole('button', { name: 'หัวข้อ 12, ดูฟรี' });
    expect(within(lastPreview).getByText('12')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /ดูอีก/ })).toBeNull();
    await user.click(lastPreview);
    expect(push).toHaveBeenCalledWith('/courses/react/learn/lesson-12');
    await user.click(screen.getByRole('button', { name: /ดูเฉพาะ.*บทฟรี/ }));
    expect(screen.getAllByRole('listitem')).toHaveLength(10);
    await user.click(screen.getByRole('button', { name: 'หัวข้อ 1, ต้องสมัครเรียนก่อน' }));
    expect(push).toHaveBeenLastCalledWith('/login?callbackUrl=/courses/react');
  });

  it('expands and collapses the curriculum and preserves enrolled lesson navigation', async () => {
    const user = userEvent.setup();
    render(<CourseLessonList lessons={lessons} courseSlug="react" courseId="course-one" isEnrolled />);
    await user.click(screen.getByRole('button', { name: 'ดูอีก 2 บทเรียน' }));
    expect(screen.getAllByRole('listitem')).toHaveLength(12);
    await user.click(screen.getByRole('button', { name: 'หัวข้อ 11, เปิดบทเรียน' }));
    expect(push).toHaveBeenLastCalledWith('/courses/react/learn/lesson-11');
    await user.click(screen.getByRole('button', { name: 'ย่อรายการบทเรียน' }));
    expect(screen.getAllByRole('listitem')).toHaveLength(10);
  });

  it('does not offer a free-preview filter when the course has no free lessons', () => {
    render(<CourseLessonList lessons={lessons.map(lesson => ({ ...lesson, isFreePreview: false }))} courseSlug="react" courseId="course-one" />);
    expect(screen.queryByRole('button', { name: /ดูเฉพาะ.*บทฟรี/ })).toBeNull();
    expect(screen.getAllByRole('listitem')).toHaveLength(10);
  });
});
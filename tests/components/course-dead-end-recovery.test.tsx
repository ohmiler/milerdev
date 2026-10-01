// @vitest-environment jsdom

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import CourseAccessDeniedNotice from '@/components/course/CourseAccessDeniedNotice';
import CourseLessonList from '@/components/course/CourseLessonList';

const push = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('next-auth/react', () => ({ useSession: () => ({ data: { user: { id: 'member-1' } } }) }));

afterEach(() => { cleanup(); vi.clearAllMocks(); });

const readSource = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('course dead-end recovery', () => {
  it('offers a way to the price and enrollment options from a locked lesson', async () => {
    const user = userEvent.setup();
    render(
      <CourseLessonList
        lessons={[{ id: 'lesson-1', title: 'บทที่ล็อก', videoDuration: 60, isFreePreview: false }]}
        courseSlug="react"
        courseId="course-one"
      />,
    );

    await user.click(screen.getByRole('button', { name: 'บทที่ล็อก, ต้องสมัครเรียนก่อน' }));

    const action = screen.getByRole('link', { name: 'ดูราคาและวิธีเข้าเรียน' });
    expect(action.getAttribute('href')).toBe('#course-action');
    expect(screen.getByRole('button', { name: 'ยังไม่ตอนนี้' })).toBeTruthy();
    expect(push).not.toHaveBeenCalled();

    await user.click(action);
    expect(screen.queryByRole('link', { name: 'ดูราคาและวิธีเข้าเรียน' })).toBeNull();
  });

  it('explains a denied lesson redirect without claiming a cause and links to recovery routes', () => {
    render(<CourseAccessDeniedNotice />);

    expect(screen.getByText('ยังเข้าบทเรียนนี้ไม่ได้')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'ตรวจสอบประวัติการชำระเงิน' }).getAttribute('href')).toBe('/dashboard/payments');
    expect(screen.getByRole('link', { name: 'ติดต่อทีมงาน' }).getAttribute('href')).toBe('/contact');
  });

  it('shows the denied notice only for access=denied and points non-enrolled lesson viewers to the course action', () => {
    const page = readSource('src/app/courses/[slug]/page.tsx');
    const workspace = readSource('src/components/course/LearnPageClient.tsx');

    expect(page).toContain("resolvedSearchParams?.access === 'denied'");
    expect(page).toContain('{accessDenied ? <CourseAccessDeniedNotice /> : null}');
    expect(workspace).toContain('{!isEnrolled && (');
    expect(workspace).toContain('`/courses/${course.slug}#course-action`');
  });
});

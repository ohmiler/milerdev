// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  CourseEnrollmentsView,
  normalizeCourseEnrollmentPage,
  type CourseEnrollmentsData,
} from '@/components/admin/CourseEnrollmentsView';

const baseData: CourseEnrollmentsData = {
  course: {
    id: 'course-1',
    title: 'Next.js สำหรับงานจริง',
    slug: 'nextjs-production',
  },
  totalLessons: 10,
  totalEnrollments: 2,
  page: 2,
  totalPages: 3,
  enrolledUsers: [
    {
      enrollmentId: 'enrollment-1',
      enrolledAt: '2026-08-20T00:00:00.000Z',
      progressPercent: 100,
      completedAt: '2026-08-24T00:00:00.000Z',
      userId: 'user-1',
      userName: 'สมชาย',
      userEmail: 'somchai@example.com',
      userAvatar: 'cdn.example.com/avatar.jpg',
      completedLessons: 10,
    },
    {
      enrollmentId: 'enrollment-2',
      enrolledAt: '2026-08-21T00:00:00.000Z',
      progressPercent: 35,
      completedAt: null,
      userId: 'user-2',
      userName: null,
      userEmail: 'learner@example.com',
      userAvatar: null,
      completedLessons: 3,
    },
  ],
};

describe('CourseEnrollmentsView', () => {
  it('normalizes invalid page query values', () => {
    expect(normalizeCourseEnrollmentPage(undefined)).toBe(1);
    expect(normalizeCourseEnrollmentPage('')).toBe(1);
    expect(normalizeCourseEnrollmentPage('-4')).toBe(1);
    expect(normalizeCourseEnrollmentPage('not-a-page')).toBe(1);
    expect(normalizeCourseEnrollmentPage('3')).toBe(3);
  });

  it('renders semantic learner states, normalized avatars, progress, and pagination', () => {
    render(<CourseEnrollmentsView data={baseData} />);

    expect(screen.getByRole('heading', { name: 'ผู้เรียนในคอร์ส' })).toBeTruthy();
    expect(screen.getByText('เรียนจบ')).toBeTruthy();
    expect(screen.getAllByText('กำลังเรียน')).toHaveLength(2);
    expect(screen.getByLabelText('ความคืบหน้า 100%')).toBeTruthy();
    expect(screen.getByText('ส')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'หน้าก่อนหน้า' }).getAttribute('href')).toBe(
      '/admin/courses/course-1/enrollments?page=1',
    );
    expect(screen.getByRole('link', { name: 'หน้าถัดไป' }).getAttribute('href')).toBe(
      '/admin/courses/course-1/enrollments?page=3',
    );
  });

  it('renders a dedicated empty state without a learner table', () => {
    render(
      <CourseEnrollmentsView
        data={{
          ...baseData,
          totalEnrollments: 0,
          enrolledUsers: [],
          page: 1,
          totalPages: 0,
        }}
      />,
    );

    expect(screen.getByText('ยังไม่มีผู้ลงทะเบียนในคอร์สนี้')).toBeTruthy();
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.queryByRole('navigation', { name: 'pagination' })).toBeNull();
  });
});

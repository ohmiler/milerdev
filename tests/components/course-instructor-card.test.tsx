// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import CourseInstructorCard, { type CourseInstructor } from '@/components/course/CourseInstructorCard';

const instructor: CourseInstructor = {
  name: 'ปฏิภาณ เพ็งเภา',
  avatarUrl: 'https://cdn.example.com/avatar.jpg',
  headline: 'ผู้ก่อตั้งและผู้สอน MilerDev',
  bio: 'สอนเขียนโปรแกรมภาษาไทยผ่านช่อง YouTube',
  profileLinks: [{ label: 'ช่อง YouTube', url: 'https://www.youtube.com/@MilerDev' }],
};

describe('CourseInstructorCard', () => {
  it('shows the profile an admin wrote, with links that open in a new tab without access to this page', () => {
    render(<CourseInstructorCard instructor={instructor} />);

    expect(screen.getByRole('heading', { level: 3, name: 'ปฏิภาณ เพ็งเภา' })).toBeTruthy();
    expect(screen.getByText('ผู้ก่อตั้งและผู้สอน MilerDev')).toBeTruthy();
    expect(screen.getByText('สอนเขียนโปรแกรมภาษาไทยผ่านช่อง YouTube')).toBeTruthy();
    const link = screen.getByRole('link', { name: 'ช่อง YouTube' });
    expect(link.getAttribute('href')).toBe('https://www.youtube.com/@MilerDev');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('keeps the card with only a name when the profile is not written yet', () => {
    render(<CourseInstructorCard instructor={{ ...instructor, avatarUrl: null, headline: null, bio: null, profileLinks: null }} />);

    expect(screen.getByRole('heading', { level: 3, name: 'ปฏิภาณ เพ็งเภา' })).toBeTruthy();
    expect(screen.getByText('ผู้สอนและดูแลเนื้อหาคอร์สนี้')).toBeTruthy();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('drops a link that is not https, even if one reached the database', () => {
    render(
      <CourseInstructorCard
        instructor={{
          ...instructor,
          profileLinks: [
            { label: 'Script', url: 'javascript:alert(1)' },
            { label: 'Plain', url: 'http://example.com' },
            { label: 'Broken', url: 'not a url' },
            { label: 'Facebook', url: 'https://www.facebook.com/milerdev' },
          ],
        }}
      />,
    );

    expect(screen.getAllByRole('link').map((link) => link.textContent)).toEqual(['Facebook']);
  });
});

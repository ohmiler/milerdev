// @vitest-environment jsdom

import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import CourseFit, { hasCourseFitContent, type CourseFitContent } from '@/components/course/CourseFit';

const empty: CourseFitContent = { learningOutcomes: null, targetAudience: null, prerequisites: null, prerequisiteCourse: null };

describe('CourseFit', () => {
  it('shows the three groups an admin wrote, with a link to the course to take first', () => {
    render(
      <CourseFit
        content={{
          learningOutcomes: ['ใช้ Hooks ได้', 'สร้างเว็บแอปที่ใส่พอร์ตได้'],
          targetAudience: ['คนที่อยากเริ่มสาย Front-end'],
          prerequisites: ['เขียน JavaScript พื้นฐานได้'],
          prerequisiteCourse: { title: 'JavaScript Mastery', slug: 'javascript-mastery' },
        }}
      />,
    );

    const outcomes = screen.getByRole('heading', { level: 3, name: 'สิ่งที่คุณจะได้' }).closest('[data-slot="card"]') as HTMLElement;
    expect(within(outcomes).getAllByRole('listitem').map((item) => item.textContent)).toEqual(['ใช้ Hooks ได้', 'สร้างเว็บแอปที่ใส่พอร์ตได้']);
    expect(screen.getByRole('heading', { level: 3, name: 'เหมาะกับ' })).toBeTruthy();
    expect(screen.getByText('เขียน JavaScript พื้นฐานได้')).toBeTruthy();
    expect(screen.getByRole('link', { name: /เริ่มที่ JavaScript Mastery/ }).getAttribute('href')).toBe('/courses/javascript-mastery');
  });

  it('leaves out a group without content instead of filling it in (ADR 0005)', () => {
    render(<CourseFit content={{ ...empty, learningOutcomes: ['ใช้ Hooks ได้'] }} />);

    expect(screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual(['สิ่งที่คุณจะได้']);
  });

  it('shows what to know first when only the course to take first is set', () => {
    render(<CourseFit content={{ ...empty, prerequisiteCourse: { title: 'JavaScript Mastery', slug: 'javascript-mastery' } }} />);

    expect(screen.getByRole('heading', { level: 3, name: 'ควรรู้ก่อนเรียน' })).toBeTruthy();
    expect(screen.queryByRole('list')).toBeNull();
  });

  it('reports whether there is anything to show, so the page can keep the description section', () => {
    expect(hasCourseFitContent(empty)).toBe(false);
    expect(hasCourseFitContent({ ...empty, learningOutcomes: [] })).toBe(false);
    expect(hasCourseFitContent({ ...empty, targetAudience: ['มือใหม่'] })).toBe(true);
    expect(hasCourseFitContent({ ...empty, prerequisiteCourse: { title: 'JS', slug: 'js' } })).toBe(true);
  });
});

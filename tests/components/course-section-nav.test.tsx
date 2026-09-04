// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import CourseSectionNav from '@/components/course/CourseSectionNav';

describe('CourseSectionNav', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/courses/typescript');
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn().mockReturnValue({ matches: true }),
    });
    window.scrollTo = vi.fn();
  });

  it('uses anchor navigation for the dynamic list of course sections', () => {
    const html = renderToStaticMarkup(
      <CourseSectionNav
        items={[
          { id: 'course-overview', label: 'รายละเอียดคอร์ส' },
          { id: 'course-curriculum', label: 'เนื้อหาคอร์ส' },
          { id: 'course-reviews', label: 'รีวิวผู้เรียน' },
        ]}
      />,
    );

    expect(html).toContain('href="#course-overview"');
    expect(html).toContain('href="#course-curriculum"');
    expect(html).toContain('href="#course-reviews"');
    expect(html).not.toContain('role="tablist"');
    expect(html).not.toContain('role="tab"');
    expect(html).toContain('grid-template-columns:repeat(3, minmax(0, 1fr))');
  });

  it('uses non-animated scrolling when reduced motion is requested', () => {
    render(
      <>
        <section id="course-overview" />
        <section id="course-reviews" />
        <CourseSectionNav items={[
          { id: 'course-overview', label: 'รายละเอียดคอร์ส' },
          { id: 'course-reviews', label: 'รีวิวผู้เรียน' },
        ]} />
      </>,
    );

    fireEvent.click(screen.getByRole('link', { name: 'รีวิวผู้เรียน' }));

    expect(window.scrollTo).toHaveBeenCalledWith({ top: -118, behavior: 'auto' });
    expect(window.location.hash).toBe('#course-reviews');
  });
});

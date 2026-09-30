/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import LessonList from '@/components/course/LessonList';
import { normalizeLessonSearch } from '@/lib/lesson-search';
beforeEach(() => { Element.prototype.scrollIntoView = vi.fn(); });
afterEach(cleanup);
const lessons = (count: number) => Array.from({ length: count }, (_, index) => ({ id: `lesson-${index}`, title: `บทเรียน คำสั่ง ${index + 1}`, videoDuration: null, isFreePreview: true }));
describe('Thai curriculum search and pagination', () => {
  it('normalizes decomposed Thai, zero-width formatting and spaces without removing tone marks', () => {
    expect(normalizeLessonSearch('  คําสั่ง\u200b  ABC ')).toBe(normalizeLessonSearch('คำสั่ง ABC'));
    expect(normalizeLessonSearch('ป่า')).not.toBe(normalizeLessonSearch('ปา'));
  });
  it.each([0, 1, 21, 55])('bounds %s matching lessons to 20 per page', (count) => {
    render(<LessonList lessons={lessons(count)} courseSlug="course" searchQuery="คําสั่ง" />);
    expect(screen.queryAllByRole('link')).toHaveLength(Math.min(20, count));
    if (count > 20) {
      fireEvent.click(screen.getByRole('button', { name: 'หน้าบทเรียนถัดไป' }));
      expect(screen.getAllByRole('link')).toHaveLength(Math.min(20, count - 20));
      expect(screen.getAllByRole('link')[0].getAttribute('href')).toContain('lesson-20');
    }
  });
  it('resets a new search and restores the current lesson page after clearing', () => {
    const props = { lessons: lessons(55), courseSlug: 'course', currentLessonId: 'lesson-45' };
    const view = render(<LessonList {...props} />);
    expect(screen.getByRole('link', { current: 'page' })).toBeTruthy();
    view.rerender(<LessonList {...props} searchQuery="คําสั่ง" />);
    expect(screen.getAllByRole('link')[0].getAttribute('href')).toContain('lesson-0');
    fireEvent.click(screen.getByRole('button', { name: 'หน้าบทเรียนถัดไป' }));
    view.rerender(<LessonList {...props} searchQuery="ไม่มีผล" />);
    expect(screen.queryAllByRole('link')).toHaveLength(0);
    view.rerender(<LessonList {...props} />);
    expect(screen.getByRole('link', { current: 'page' })).toBeTruthy();
  });
});

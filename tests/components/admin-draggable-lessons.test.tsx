// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import DraggableLessonList, {
  filterLessons,
  formatLessonDuration,
  getLessonHealth,
  parseLessonDuration,
  reorderLessonIds,
  type Lesson,
} from '@/components/admin/DraggableLessonList';

const lessons: Lesson[] = [
  {
    id: 'lesson-1',
    title: 'บทพร้อมใช้งาน',
    content: '<p>เนื้อหา</p>',
    videoUrl: 'video-1',
    videoDuration: 630,
    orderIndex: 0,
    isFreePreview: true,
  },
  {
    id: 'lesson-2',
    title: 'บทที่ยังไม่มีวิดีโอ',
    content: '<p>เนื้อหา</p>',
    videoUrl: null,
    videoDuration: null,
    orderIndex: 1,
    isFreePreview: false,
  },
];

describe('DraggableLessonList', () => {
  it('derives duration, health, filters, and drag ordering', () => {
    expect(formatLessonDuration(630)).toBe('10:30');
    expect(parseLessonDuration('10:30')).toBe(630);
    expect(parseLessonDuration('1.5')).toBe(90);
    expect(getLessonHealth(lessons[0])).toEqual({ label: 'พร้อมใช้งาน', tone: 'success' });
    expect(getLessonHealth(lessons[1])).toEqual({ label: 'ขาดวิดีโอ', tone: 'warning' });
    expect(filterLessons(lessons, 'พร้อม', 'all')).toEqual([lessons[0]]);
    expect(filterLessons(lessons, '', 'no-video')).toEqual([lessons[1]]);
    expect(reorderLessonIds(lessons, 'lesson-1', 'lesson-2')).toEqual([
      'lesson-2',
      'lesson-1',
    ]);
  });

  it('uses semantic tabs for filtering and disables drag handles while filtering', async () => {
    const user = userEvent.setup();
    render(
      <DraggableLessonList
        lessons={lessons}
        courseId="course-1"
        onDelete={vi.fn()}
        onReorder={vi.fn()}
      />,
    );

    const needsWorkTab = screen.getByRole('tab', { name: /ต้องตรวจ/ });
    await user.click(needsWorkTab);

    expect(screen.queryByText('บทพร้อมใช้งาน')).toBeNull();
    expect(screen.getByText('บทที่ยังไม่มีวิดีโอ')).toBeTruthy();
    expect(
      (screen.getByRole('button', { name: 'ลากเพื่อจัดลำดับบทเรียน' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });
});

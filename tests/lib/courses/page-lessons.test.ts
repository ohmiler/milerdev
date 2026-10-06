import { beforeEach, describe, expect, it, vi } from 'vitest';

const selectMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/db', () => ({ db: { select: selectMock } }));

import { coursePageLessonColumns, readCoursePageLessons } from '@/lib/courses/page-lessons';

describe('public course page lesson projection', () => {
  beforeEach(() => {
    selectMock.mockReset();
  });

  it('selects only visitor-safe lesson columns', () => {
    expect(Object.keys(coursePageLessonColumns).sort()).toEqual([
      'id',
      'isFreePreview',
      'sectionId',
      'sectionTitle',
      'title',
      'videoDuration',
    ]);
    expect(coursePageLessonColumns).not.toHaveProperty('videoUrl');
    expect(coursePageLessonColumns).not.toHaveProperty('content');
  });

  it('passes the restricted column map to the query and returns its rows', async () => {
    const rows = [{ id: 'l1', title: 'Intro', videoDuration: 60, isFreePreview: true, sectionId: null, sectionTitle: null }];
    const orderBy = vi.fn().mockResolvedValue(rows);
    const where = vi.fn().mockReturnValue({ orderBy });
    const leftJoin = vi.fn().mockReturnValue({ where });
    const from = vi.fn().mockReturnValue({ leftJoin });
    selectMock.mockReturnValue({ from });

    await expect(readCoursePageLessons('course-1')).resolves.toEqual(rows);

    expect(selectMock).toHaveBeenCalledTimes(1);
    expect(selectMock).toHaveBeenCalledWith(coursePageLessonColumns);
    expect(orderBy).toHaveBeenCalledTimes(1);
  });
});

// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/ui/Toast', () => ({ showToast: vi.fn() }));

import DraggableLessonList, {
  applyCourseStructure,
  filterLessons,
  formatLessonDuration,
  getLessonHealth,
  parseLessonDuration,
  reorderLessonIds,
  type Lesson,
  type LessonSection,
} from '@/components/admin/DraggableLessonList';
import { showToast } from '@/components/ui/Toast';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

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

const sections: LessonSection[] = [
  { id: 'section-a', title: 'พื้นฐาน' },
  { id: 'section-b', title: 'ลงมือทำ' },
];
const sectionedLessons: Lesson[] = [
  { ...lessons[0], sectionId: 'section-a' },
  { ...lessons[1], sectionId: 'section-b' },
];

function stubFetch(status = 200) {
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({}), { status }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function sentBody(fetchMock: ReturnType<typeof stubFetch>) {
  const [url, init] = fetchMock.mock.calls[0];
  return { url, body: JSON.parse(init.body) };
}

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

  it('filters with pressed buttons and disables drag handles while filtering', async () => {
    const user = userEvent.setup();
    render(
      <DraggableLessonList
        lessons={lessons}
        courseId="course-1"
        onDelete={vi.fn()}
        onStructureChange={vi.fn()}
      />,
    );

    // One list is filtered, so these are toggle buttons, not tabs with panels.
    expect(screen.queryByRole('tab')).toBeNull();
    const needsWork = screen.getByRole('button', { name: /ต้องตรวจ/ });
    expect(needsWork.getAttribute('aria-pressed')).toBe('false');
    await user.click(needsWork);
    expect(needsWork.getAttribute('aria-pressed')).toBe('true');

    expect(screen.queryByText('บทพร้อมใช้งาน')).toBeNull();
    expect(screen.getByText('บทที่ยังไม่มีวิดีโอ')).toBeTruthy();
    expect(
      (screen.getByRole('button', { name: 'ลากเพื่อจัดลำดับบทเรียน' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });

  it('shows no section controls for a course without sections', () => {
    render(<DraggableLessonList lessons={lessons} courseId="course-1" onDelete={vi.fn()} onStructureChange={vi.fn()} />);
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(screen.queryByRole('heading', { level: 3 })).toBeNull();
  });

  it('groups lessons under their sections and keeps course-wide numbering', () => {
    render(
      <DraggableLessonList lessons={sectionedLessons} sections={sections} courseId="course-1" onDelete={vi.fn()} onStructureChange={vi.fn()} />,
    );
    expect(screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual([
      'พื้นฐาน 1 บท',
      'ลงมือทำ 1 บท',
    ]);
    expect(screen.getByText('02')).toBeTruthy();
  });

  it('moves a lesson to the end of another section and saves the whole structure', async () => {
    const user = userEvent.setup();
    const fetchMock = stubFetch();
    const onStructureChange = vi.fn();
    render(
      <DraggableLessonList lessons={sectionedLessons} sections={sections} courseId="course-1" onDelete={vi.fn()} onStructureChange={onStructureChange} />,
    );

    await user.selectOptions(screen.getByRole('combobox', { name: 'หมวดของบทเรียน บทพร้อมใช้งาน' }), 'section-b');

    const { url, body } = sentBody(fetchMock);
    expect(url).toBe('/api/admin/courses/course-1/lessons/reorder');
    expect(body).toEqual({
      unsectionedLessonIds: [],
      sections: [
        { id: 'section-a', lessonIds: [] },
        { id: 'section-b', lessonIds: ['lesson-2', 'lesson-1'] },
      ],
    });
    const outline = onStructureChange.mock.calls[0][0];
    expect(outline.lessons.map((lesson: Lesson) => [lesson.id, lesson.sectionId])).toEqual([
      ['lesson-2', 'section-b'],
      ['lesson-1', 'section-b'],
    ]);
  });

  it('moves a section down with its lessons and restores the order when the save fails', async () => {
    const user = userEvent.setup();
    const fetchMock = stubFetch(409);
    const onStructureChange = vi.fn();
    render(
      <DraggableLessonList lessons={sectionedLessons} sections={sections} courseId="course-1" onDelete={vi.fn()} onStructureChange={onStructureChange} />,
    );

    expect((screen.getByRole('button', { name: 'ย้ายหมวด พื้นฐาน ขึ้น' }) as HTMLButtonElement).disabled).toBe(true);
    await user.click(screen.getByRole('button', { name: 'ย้ายหมวด พื้นฐาน ลง' }));

    expect(sentBody(fetchMock).body.sections.map((section: { id: string }) => section.id)).toEqual(['section-b', 'section-a']);
    expect(onStructureChange.mock.calls[0][0].sections.map((section: LessonSection) => section.id)).toEqual(['section-b', 'section-a']);
    expect(onStructureChange.mock.calls.at(-1)?.[0]).toEqual({ lessons: sectionedLessons, sections });
    expect(showToast).toHaveBeenCalledWith(expect.any(String), 'error');
  });

  it('applies a structure the way the server orders it: unsectioned lessons first', () => {
    const outline = applyCourseStructure(
      { lessons: sectionedLessons, sections },
      { unsectionedLessonIds: ['lesson-2'], sections: [{ id: 'section-a', lessonIds: ['lesson-1'] }, { id: 'section-b', lessonIds: [] }] },
    );
    expect(outline.lessons.map((lesson) => [lesson.id, lesson.sectionId])).toEqual([
      ['lesson-2', null],
      ['lesson-1', 'section-a'],
    ]);
  });
});

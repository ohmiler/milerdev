import { describe, expect, it, vi } from 'vitest';

import { getCourseLearning, type DashboardLearningStore } from '@/lib/learning/dashboard';

const lessons = [
  { id: 'l3', title: 'Grid', orderIndex: 3 },
  { id: 'l1', title: 'แนะนำ', orderIndex: 1 },
  { id: 'l2', title: 'Flexbox', orderIndex: 2 },
];
const enrollmentIn = (courseId: string, overrides: Record<string, unknown> = {}) => ({
  course: { id: courseId, title: 'HTML & CSS', slug: 'html-css', thumbnailUrl: null },
  enrollment: { enrolledAt: new Date('2026-09-01T00:00:00Z'), completedAt: null },
  lessons,
  progress: [],
  certificate: null,
  ...overrides,
});
const storeWith = (enrollments: ReturnType<typeof enrollmentIn>[]): DashboardLearningStore => ({
  read: vi.fn().mockResolvedValue({ enrollments, activeCertificateCount: 0, paymentCount: 0 }),
});

describe('getCourseLearning', () => {
  it('reads only the asked course, and names the next lesson by its place in the course', async () => {
    const store = storeWith([enrollmentIn('course-1', {
      progress: [{ lessonId: 'l1', completed: true, watchTimeSeconds: 300, lastWatchedAt: new Date('2026-09-02T00:00:00Z') }],
    })]);

    const learning = await getCourseLearning('member-1', 'course-1', store);

    expect(store.read).toHaveBeenCalledWith('member-1', { courseId: 'course-1' });
    expect(learning).toEqual({
      progress: { completedLessons: 1, totalLessons: 3, percent: 33 },
      continuation: 'resume',
      completed: false,
      nextLesson: { title: 'Flexbox', position: 2 },
    });
  });

  it('starts at the first lesson before anything is watched', async () => {
    const learning = await getCourseLearning('member-1', 'course-1', storeWith([enrollmentIn('course-1')]));

    expect(learning).toMatchObject({ continuation: 'start', nextLesson: { title: 'แนะนำ', position: 1 } });
  });

  it('reports a finished course with no next lesson', async () => {
    const learning = await getCourseLearning('member-1', 'course-1', storeWith([enrollmentIn('course-1', {
      enrollment: { enrolledAt: new Date('2026-09-01T00:00:00Z'), completedAt: new Date('2026-09-20T00:00:00Z') },
    })]));

    expect(learning).toMatchObject({ completed: true, continuation: 'review', nextLesson: null });
  });

  it('returns null when the member has no enrollment in the course', async () => {
    expect(await getCourseLearning('member-1', 'course-1', storeWith([enrollmentIn('other-course')]))).toBeNull();
  });
});

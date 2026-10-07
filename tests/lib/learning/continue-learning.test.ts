import { describe, expect, it, vi } from 'vitest';

import { getContinueLearning, type DashboardLearningStore } from '@/lib/learning/dashboard';
import type { LearningPresentationSource } from '@/lib/learning/presentation';

const lessons = [
  { id: 'l1', title: 'Introduction', orderIndex: 1 },
  { id: 'l3', title: 'Flexbox คืออะไร', orderIndex: 3 },
  { id: 'l2', title: 'HTML Elements', orderIndex: 2 },
];

function enrollment(id: string, overrides: Partial<LearningPresentationSource> = {}): LearningPresentationSource {
  return {
    course: { id, title: `Course ${id}`, slug: id, thumbnailUrl: null },
    enrollment: { enrolledAt: new Date('2026-09-01T00:00:00.000Z'), completedAt: null },
    lessons,
    progress: [],
    certificate: null,
    ...overrides,
  };
}

const storeOf = (enrollments: LearningPresentationSource[]): DashboardLearningStore => ({
  read: vi.fn().mockResolvedValue({ enrollments, activeCertificateCount: 0, paymentCount: 0 }),
});

describe('getContinueLearning', () => {
  it('picks the next lesson, numbered by lesson order, in the course touched last', async () => {
    const older = enrollment('older', { progress: [{ lessonId: 'l1', completed: true, watchTimeSeconds: 60, lastWatchedAt: new Date('2026-09-02') }] });
    const recent = enrollment('recent', {
      progress: [
        { lessonId: 'l1', completed: true, watchTimeSeconds: 60, lastWatchedAt: new Date('2026-10-01') },
        { lessonId: 'l2', completed: true, watchTimeSeconds: 60, lastWatchedAt: new Date('2026-10-02') },
      ],
    });

    const result = await getContinueLearning('member', storeOf([older, recent]));

    expect(result).toEqual({
      course: { title: 'Course recent', slug: 'recent', thumbnailUrl: null },
      lesson: { title: 'Flexbox คืออะไร', position: 3 },
      progress: { completedLessons: 2, totalLessons: 3, percent: 67 },
      continuation: 'resume',
      href: '/courses/recent/learn',
    });
  });

  it('offers the first lesson of a course not started yet', async () => {
    const result = await getContinueLearning('member', storeOf([enrollment('fresh')]));

    expect(result).toMatchObject({ continuation: 'start', lesson: { title: 'Introduction', position: 1 } });
  });

  it('skips finished courses and courses without lessons, and returns null when nothing is in progress', async () => {
    const finished = enrollment('done', { enrollment: { enrolledAt: new Date('2026-09-01'), completedAt: new Date('2026-09-20') } });
    const empty = enrollment('empty', { lessons: [] });

    expect(await getContinueLearning('member', storeOf([finished, empty]))).toBeNull();
    expect(await getContinueLearning('member', storeOf([]))).toBeNull();
  });
});

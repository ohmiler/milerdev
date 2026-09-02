import { describe, expect, it } from 'vitest';

import {
  deriveLearningPresentation,
  type LearningPresentationSource,
} from '@/lib/learning-presentation';

const lessons = [
  { id: 'lesson-1', title: 'เริ่มต้น TypeScript', orderIndex: 1 },
  { id: 'lesson-2', title: 'Generics', orderIndex: 2 },
  { id: 'lesson-3', title: 'Workshop', orderIndex: 3 },
];

function source(progress: LearningPresentationSource['progress']): LearningPresentationSource {
  return {
    course: {
      id: 'course-1',
      title: 'TypeScript Foundations',
      slug: 'typescript',
      thumbnailUrl: null,
    },
    enrollment: {
      enrolledAt: new Date('2026-08-01T00:00:00.000Z'),
      completedAt: null,
    },
    lessons,
    progress,
    certificate: null,
  };
}

describe('LearningPresentation progress states', () => {
  it('derives start, resume, and completion-pending actions without treating 100% as completion', () => {
    const starting = deriveLearningPresentation(source([]));
    const partial = deriveLearningPresentation(source([
      {
        lessonId: 'lesson-1',
        completed: true,
        watchTimeSeconds: 300,
        lastWatchedAt: new Date('2026-08-02T00:00:00.000Z'),
      },
      {
        lessonId: 'lesson-2',
        completed: false,
        watchTimeSeconds: 90,
        lastWatchedAt: new Date('2026-08-03T00:00:00.000Z'),
      },
    ]));
    const awaitingCompletion = deriveLearningPresentation(source(
      lessons.map((lesson) => ({
        lessonId: lesson.id,
        completed: true,
        watchTimeSeconds: 300,
        lastWatchedAt: new Date('2026-08-04T00:00:00.000Z'),
      })),
    ));

    expect(starting).toMatchObject({
      enrollment: 'active',
      progress: { completedLessons: 0, totalLessons: 3, percent: 0 },
      continuation: 'start',
      certificate: 'not_eligible',
      status: { label: 'พร้อมเริ่มเรียน' },
      action: {
        kind: 'start',
        label: 'เริ่มบทแรก',
        href: '/courses/typescript/learn',
      },
    });
    expect(partial).toMatchObject({
      enrollment: 'active',
      progress: { completedLessons: 1, totalLessons: 3, percent: 33 },
      continuation: 'resume',
      status: { label: 'กำลังเรียน · 1/3 บท' },
      action: {
        kind: 'resume',
        label: 'เรียนต่อ: Generics',
        href: '/courses/typescript/learn',
      },
    });
    expect(awaitingCompletion).toMatchObject({
      enrollment: 'active',
      progress: { completedLessons: 3, totalLessons: 3, percent: 100 },
      continuation: 'review',
      certificate: 'not_eligible',
      status: { label: 'เรียนครบแล้ว · กำลังยืนยันการจบ' },
      action: {
        kind: 'review',
        label: 'เปิดคอร์สเพื่อตรวจสถานะ',
        href: '/courses/typescript/learn',
      },
    });
  });
});

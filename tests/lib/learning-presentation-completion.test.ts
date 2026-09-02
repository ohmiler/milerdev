import { describe, expect, it } from 'vitest';

import {
  deriveLearningPresentation,
  type LearningPresentationSource,
} from '@/lib/learning-presentation';

const baseSource: Omit<LearningPresentationSource, 'certificate'> = {
  course: {
    id: 'course-1',
    title: 'TypeScript Foundations',
    slug: 'typescript',
    thumbnailUrl: null,
  },
  enrollment: {
    enrolledAt: new Date('2026-08-01T00:00:00.000Z'),
    completedAt: new Date('2026-08-10T00:00:00.000Z'),
  },
  lessons: [
    { id: 'lesson-1', title: 'เริ่มต้น', orderIndex: 1 },
    { id: 'lesson-2', title: 'Generics', orderIndex: 2 },
    { id: 'lesson-3', title: 'Workshop ใหม่', orderIndex: 3 },
  ],
  progress: [
    {
      lessonId: 'lesson-1',
      completed: true,
      watchTimeSeconds: 300,
      lastWatchedAt: new Date('2026-08-02T00:00:00.000Z'),
    },
    {
      lessonId: 'lesson-2',
      completed: true,
      watchTimeSeconds: 300,
      lastWatchedAt: new Date('2026-08-03T00:00:00.000Z'),
    },
  ],
};

describe('LearningPresentation completion and certificate facts', () => {
  it('keeps authoritative completion separate from current progress and certificate status', () => {
    const missing = deriveLearningPresentation({ ...baseSource, certificate: null });
    const active = deriveLearningPresentation({
      ...baseSource,
      certificate: { revokedAt: null },
    });
    const revoked = deriveLearningPresentation({
      ...baseSource,
      certificate: {
        revokedAt: new Date('2026-08-20T00:00:00.000Z'),
      },
    });

    expect(missing).toMatchObject({
      enrollment: 'completed',
      progress: { completedLessons: 2, totalLessons: 3, percent: 67 },
      continuation: 'review',
      certificate: 'missing',
      status: { label: 'เรียนจบแล้ว · ยังไม่พบใบรับรอง' },
      action: {
        kind: 'view-certificates',
        label: 'ตรวจสอบสถานะใบรับรอง',
        href: '/dashboard/certificates',
      },
    });
    expect(active).toMatchObject({
      enrollment: 'completed',
      certificate: 'active',
      status: { label: 'เรียนจบแล้ว · ใบรับรองพร้อม' },
      action: { kind: 'view-certificates', label: 'ดูและแชร์ใบรับรอง' },
    });
    expect(revoked).toMatchObject({
      enrollment: 'completed',
      certificate: 'revoked',
      status: { label: 'เรียนจบแล้ว · ใบรับรองถูกเพิกถอน' },
      action: { kind: 'view-certificates', label: 'ดูสถานะใบรับรอง' },
    });
  });
});

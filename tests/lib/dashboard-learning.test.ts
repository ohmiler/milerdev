import { describe, expect, it, vi } from 'vitest';

import {
  getDashboardLearning,
  type DashboardLearningStore,
} from '@/lib/dashboard-learning';

describe('getDashboardLearning', () => {
  it('returns a minimal presentation without private source fields', async () => {
    const store: DashboardLearningStore = {
      read: vi.fn().mockResolvedValue({
        enrollments: [
          {
            course: {
              id: 'course-active',
              title: 'Active Course',
              slug: 'active-course',
              thumbnailUrl: null,
            },
            enrollment: {
              enrolledAt: new Date('2026-08-20T00:00:00.000Z'),
              completedAt: null,
            },
            lessons: [
              { id: 'private-lesson-id', title: 'บทเรียนถัดไป', orderIndex: 1 },
            ],
            progress: [
              {
                lessonId: 'private-lesson-id',
                completed: false,
                watchTimeSeconds: 45,
                lastWatchedAt: new Date('2026-09-01T00:00:00.000Z'),
              },
            ],
            certificate: null,
          },
          {
            course: {
              id: 'course-completed',
              title: 'Completed Course',
              slug: 'completed-course',
              thumbnailUrl: null,
            },
            enrollment: {
              enrolledAt: new Date('2026-07-01T00:00:00.000Z'),
              completedAt: new Date('2026-07-20T00:00:00.000Z'),
            },
            lessons: [],
            progress: [],
            certificate: {
              revokedAt: new Date('2026-08-01T00:00:00.000Z'),
            },
          },
        ],
        activeCertificateCount: 0,
        paymentCount: 7,
      }),
    };

    const dashboard = await getDashboardLearning('private-member-id', store);

    expect(store.read).toHaveBeenCalledWith('private-member-id');
    expect(dashboard).toMatchObject({
      summary: {
        courseCount: 2,
        activeCourseCount: 1,
        completedCourseCount: 1,
        activeCertificateCount: 0,
        paymentCount: 7,
      },
      primary: {
        enrollment: 'active',
        course: { slug: 'active-course' },
        action: { label: 'เรียนต่อ: บทเรียนถัดไป' },
      },
      remaining: [
        {
          enrollment: 'completed',
          course: { slug: 'completed-course' },
          certificate: 'revoked',
        },
      ],
    });

    const serialized = JSON.stringify(dashboard);
    expect(serialized).not.toContain('private-member-id');
    expect(serialized).not.toContain('course-active');
    expect(serialized).not.toContain('course-completed');
    expect(serialized).not.toContain('private-lesson-id');
    expect(serialized).not.toContain('2026-09-01');
  });
});

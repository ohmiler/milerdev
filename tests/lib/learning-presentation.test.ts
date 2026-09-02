import { describe, expect, it } from 'vitest';

import { deriveLearningPresentation } from '@/lib/learning-presentation';

describe('LearningPresentation', () => {
  it('keeps a member without enrollment distinct from a learner', () => {
    const presentation = deriveLearningPresentation(null);

    expect(presentation).toEqual({
      enrollment: 'none',
      course: null,
      progress: {
        completedLessons: 0,
        totalLessons: 0,
        percent: 0,
      },
      continuation: 'none',
      certificate: 'not_eligible',
      status: {
        label: 'ยังไม่มีคอร์สในการเรียนของฉัน',
        description: 'เลือกดูรายละเอียดและบทเรียนของแต่ละคอร์สก่อนเริ่มเส้นทางแรก',
      },
      action: {
        kind: 'view-catalog',
        label: 'ดูคอร์สทั้งหมด',
        href: '/courses',
      },
    });
  });
});

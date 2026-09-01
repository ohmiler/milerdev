import { describe, expect, it } from 'vitest';

import { deriveLearningMilestoneIdentities } from '@/lib/learning-progress';

const base = {
  progressId: 'progress-1',
  enrollmentId: 'enrollment-1',
  lessonCompletedBefore: false,
  lessonCompletedAfter: true,
  courseCompletedBefore: false,
  courseCompletedAfter: false,
};

describe('learning progress milestone transitions', () => {
  it('emits a lesson fact only for the first persisted false-to-true transition', () => {
    expect(deriveLearningMilestoneIdentities(base)).toEqual([
      { eventName: 'lesson_completed', factId: 'progress-1' },
    ]);
  });

  it('emits the course fact only with the first null-to-completed transition', () => {
    expect(deriveLearningMilestoneIdentities({
      ...base,
      courseCompletedAfter: true,
    })).toEqual([
      { eventName: 'lesson_completed', factId: 'progress-1' },
      { eventName: 'course_completed', factId: 'enrollment-1' },
    ]);
  });

  it('does not emit positive facts for duplicate saves or negative transitions', () => {
    expect(deriveLearningMilestoneIdentities({
      ...base,
      lessonCompletedBefore: true,
      lessonCompletedAfter: true,
      courseCompletedBefore: true,
      courseCompletedAfter: true,
    })).toEqual([]);
    expect(deriveLearningMilestoneIdentities({
      ...base,
      lessonCompletedBefore: true,
      lessonCompletedAfter: false,
      courseCompletedBefore: true,
      courseCompletedAfter: false,
    })).toEqual([]);
  });
});

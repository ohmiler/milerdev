import { describe, expect, it, vi } from 'vitest';

import {
  deriveLearningMilestoneIdentities,
  retryLearningProgressTransaction,
} from '@/lib/learning-progress';

const base = {
  progressId: 'progress-1',
  enrollmentId: 'enrollment-1',
  lessonCompletedBefore: false,
  lessonCompletedAfter: true,
  courseCompletedBefore: false,
  courseCompletedAfter: false,
};

describe('learning progress milestone transitions', () => {
  it('retries the complete transaction once after a natural-key race', async () => {
    const duplicate = Object.assign(new Error('Duplicate entry'), { code: 'ER_DUP_ENTRY' });
    let attempts = 0;

    await expect(retryLearningProgressTransaction(async () => {
      attempts += 1;
      if (attempts === 1) throw duplicate;
      return 'saved' as const;
    })).resolves.toBe('saved');
    expect(attempts).toBe(2);
  });

  it('does not retry non-duplicate transaction failures', async () => {
    const failure = new Error('database unavailable');
    const operation = vi.fn().mockRejectedValue(failure);

    await expect(retryLearningProgressTransaction(operation)).rejects.toBe(failure);
    expect(operation).toHaveBeenCalledOnce();
  });

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

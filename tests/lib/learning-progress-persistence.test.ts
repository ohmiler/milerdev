import { describe, expect, it } from 'vitest';

import { derivePersistedLearningProgress } from '@/lib/learning-progress';

describe('learning progress persistence boundary', () => {
  it('keeps watch position monotonic when a stale client reports a lower value', () => {
    expect(derivePersistedLearningProgress(
      { completed: false, watchTimeSeconds: 120 },
      { watchTimeSeconds: 60 },
    )).toEqual({
      completed: false,
      watchTimeSeconds: 120,
      changed: false,
    });
  });

  it('makes repeated completion updates idempotent', () => {
    expect(derivePersistedLearningProgress(
      { completed: true, watchTimeSeconds: 120 },
      { completed: true, watchTimeSeconds: 120 },
    )).toEqual({
      completed: true,
      watchTimeSeconds: 120,
      changed: false,
    });
  });

  it('preserves the existing explicit completion policy', () => {
    expect(derivePersistedLearningProgress(
      { completed: true, watchTimeSeconds: 120 },
      { completed: false },
    )).toEqual({
      completed: false,
      watchTimeSeconds: 120,
      changed: true,
    });
  });
});

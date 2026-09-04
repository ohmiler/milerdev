import { describe, expect, it } from 'vitest';

import { normalizeCourseReviewStats } from '@/lib/course-review-stats';

describe('normalizeCourseReviewStats', () => {
  it('normalizes MySQL aggregate strings for verified review evidence', () => {
    expect(normalizeCourseReviewStats({
      avgRating: '4.75',
      totalReviews: 8,
      star5: '6',
      star4: 1,
      star3: 1,
      star2: null,
      star1: null,
    })).toEqual({
      avgRating: 4.75,
      totalReviews: 8,
      distribution: { 5: 6, 4: 1, 3: 1, 2: 0, 1: 0 },
    });
  });

  it('returns an empty truthful aggregate when no visible reviews exist', () => {
    expect(normalizeCourseReviewStats(undefined)).toEqual({
      avgRating: 0,
      totalReviews: 0,
      distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
    });
  });
});

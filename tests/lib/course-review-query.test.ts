import { describe, expect, it } from 'vitest';

import {
  buildCourseReviewHref,
  normalizeCourseReviewQuery,
} from '@/lib/course-review-query';

describe('course review URL state', () => {
  it('normalizes invalid and duplicate review parameters to defaults', () => {
    expect(normalizeCourseReviewQuery({
      reviewSort: ['oldest', 'highest'],
      reviewRating: '9',
      reviewPage: '-2',
    })).toEqual({
      query: { sort: 'latest', rating: null, page: 1 },
      isCanonical: false,
    });
  });

  it('accepts namespaced sort, rating, and page state', () => {
    expect(normalizeCourseReviewQuery({
      reviewSort: 'lowest',
      reviewRating: '2',
      reviewPage: '3',
    })).toEqual({
      query: { sort: 'lowest', rating: 2, page: 3 },
      isCanonical: true,
    });
  });

  it('does not treat the string null as a canonical rating', () => {
    expect(normalizeCourseReviewQuery({ reviewRating: 'null' })).toEqual({
      query: { sort: 'latest', rating: null, page: 1 },
      isCanonical: false,
    });
  });

  it('preserves unrelated URL state and omits review defaults', () => {
    const current = new URLSearchParams('ref=facebook&reviewSort=highest&reviewRating=5&reviewPage=4');

    expect(buildCourseReviewHref('/courses/typescript', current, {
      sort: 'highest',
      rating: 5,
      page: 4,
    }, { rating: null, page: 1 })).toBe(
      '/courses/typescript?ref=facebook&reviewSort=highest#course-reviews',
    );
  });
});

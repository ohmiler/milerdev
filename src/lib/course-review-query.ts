export const COURSE_REVIEW_SORTS = ['latest', 'highest', 'lowest'] as const;

export type CourseReviewSort = (typeof COURSE_REVIEW_SORTS)[number];

export type CourseReviewQuery = {
  sort: CourseReviewSort;
  rating: number | null;
  page: number;
};

export type CourseReviewQueryInput = {
  reviewSort?: string | string[];
  reviewRating?: string | string[];
  reviewPage?: string | string[];
};

function scalar(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? undefined : value;
}

export function normalizeCourseReviewQuery(input: CourseReviewQueryInput): {
  query: CourseReviewQuery;
  isCanonical: boolean;
} {
  const sortValue = scalar(input.reviewSort);
  const ratingValue = scalar(input.reviewRating);
  const pageValue = scalar(input.reviewPage);
  const sort = COURSE_REVIEW_SORTS.includes(sortValue as CourseReviewSort)
    ? sortValue as CourseReviewSort
    : 'latest';
  const parsedRating = ratingValue === undefined ? null : Number(ratingValue);
  const rating = parsedRating !== null
    && Number.isInteger(parsedRating)
    && parsedRating >= 1
    && parsedRating <= 5
    ? parsedRating
    : null;
  const parsedPage = pageValue === undefined ? 1 : Number(pageValue);
  const page = Number.isInteger(parsedPage) && parsedPage >= 1 ? parsedPage : 1;
  const hasArray = Object.values(input).some(Array.isArray);
  const isCanonical = !hasArray
    && (sortValue === undefined || (sortValue === sort && sort !== 'latest'))
    && (ratingValue === undefined || (rating !== null && ratingValue === String(rating)))
    && (pageValue === undefined || (pageValue === String(page) && page > 1));

  return { query: { sort, rating, page }, isCanonical };
}

type SearchParamsSource = Pick<URLSearchParams, 'toString'>;

export function buildCourseReviewHref(
  pathname: string,
  current: SearchParamsSource,
  query: CourseReviewQuery,
  overrides: Partial<CourseReviewQuery> = {},
): string {
  const next = { ...query, ...overrides };
  const params = new URLSearchParams(current.toString());

  params.delete('reviewSort');
  params.delete('reviewRating');
  params.delete('reviewPage');

  if (next.sort !== 'latest') params.set('reviewSort', next.sort);
  if (next.rating !== null) params.set('reviewRating', String(next.rating));
  if (next.page > 1) params.set('reviewPage', String(next.page));

  const search = params.toString();
  return `${pathname}${search ? `?${search}` : ''}#course-reviews`;
}

export const COURSE_CATALOG_PRICES = ['all', 'free', 'paid'] as const;
export const COURSE_CATALOG_SORTS = ['newest', 'oldest', 'price-low', 'price-high'] as const;

export type CourseCatalogPrice = (typeof COURSE_CATALOG_PRICES)[number];
export type CourseCatalogSort = (typeof COURSE_CATALOG_SORTS)[number];

export type CourseCatalogQuery = {
  search: string;
  price: CourseCatalogPrice;
  tag: string;
  sort: CourseCatalogSort;
  page: number;
};

export type CourseCatalogQueryInput = Record<string, string | string[] | undefined>;
export type CourseCatalogPageItem = number | 'start-ellipsis' | 'end-ellipsis';

const DEFAULT_QUERY: CourseCatalogQuery = {
  search: '',
  price: 'all',
  tag: 'all',
  sort: 'newest',
  page: 1,
};

function singleValue(value: string | string[] | undefined): string {
  return typeof value === 'string' ? value : Array.isArray(value) ? value[0] ?? '' : '';
}

function isOneOf<T extends string>(value: string, values: readonly T[]): value is T {
  return values.includes(value as T);
}

function parsePage(value: string): number {
  if (!/^[1-9]\d*$/.test(value)) return 1;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : 1;
}

function canonicalEntries(query: CourseCatalogQuery): Record<string, string> {
  return Object.fromEntries(
    new URL(buildCourseCatalogHref(query), 'https://milerdev.local').searchParams.entries(),
  );
}

export function normalizeCourseCatalogQuery(
  input: CourseCatalogQueryInput,
  validTagSlugs: Iterable<string>,
): { query: CourseCatalogQuery; isCanonical: boolean } {
  const validTags = new Set(validTagSlugs);
  const rawSearch = singleValue(input.search);
  const rawPrice = singleValue(input.price);
  const rawTag = singleValue(input.tag);
  const rawSort = singleValue(input.sort);
  const rawPage = singleValue(input.page);

  const query: CourseCatalogQuery = {
    search: rawSearch.trim(),
    price: isOneOf(rawPrice, COURSE_CATALOG_PRICES) ? rawPrice : DEFAULT_QUERY.price,
    tag: rawTag === 'all' || validTags.has(rawTag) ? rawTag : DEFAULT_QUERY.tag,
    sort: isOneOf(rawSort, COURSE_CATALOG_SORTS) ? rawSort : DEFAULT_QUERY.sort,
    page: parsePage(rawPage),
  };

  if (!rawPrice) query.price = DEFAULT_QUERY.price;
  if (!rawTag) query.tag = DEFAULT_QUERY.tag;
  if (!rawSort) query.sort = DEFAULT_QUERY.sort;
  if (!rawPage) query.page = DEFAULT_QUERY.page;

  const expected = canonicalEntries(query);
  const actualKeys = Object.keys(input).filter((key) => input[key] !== undefined);
  const isCanonical = actualKeys.length === Object.keys(expected).length
    && actualKeys.every((key) => (
      Object.hasOwn(expected, key)
      && typeof input[key] === 'string'
      && input[key] === expected[key]
    ));

  return { query, isCanonical };
}

export function buildCourseCatalogHref(
  query: CourseCatalogQuery,
  overrides: Partial<CourseCatalogQuery> = {},
): string {
  const nextQuery = { ...query, ...overrides };
  const params = new URLSearchParams();

  if (nextQuery.search) params.set('search', nextQuery.search);
  if (nextQuery.price !== DEFAULT_QUERY.price) params.set('price', nextQuery.price);
  if (nextQuery.tag !== DEFAULT_QUERY.tag) params.set('tag', nextQuery.tag);
  if (nextQuery.sort !== DEFAULT_QUERY.sort) params.set('sort', nextQuery.sort);
  if (nextQuery.page > DEFAULT_QUERY.page) params.set('page', String(nextQuery.page));

  const search = params.toString();
  return search ? `/courses?${search}` : '/courses';
}

export function clampCourseCatalogPage(page: number, totalPages: number): number {
  return Math.min(Math.max(1, page), Math.max(1, totalPages));
}

export function getCourseCatalogPageItems(
  currentPage: number,
  totalPages: number,
): CourseCatalogPageItem[] {
  if (totalPages <= 0) return [];
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);

  const page = clampCourseCatalogPage(currentPage, totalPages);
  if (page <= 4) return [1, 2, 3, 4, 5, 'end-ellipsis', totalPages];
  if (page >= totalPages - 3) {
    return [1, 'start-ellipsis', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }

  return [1, 'start-ellipsis', page - 1, page, page + 1, 'end-ellipsis', totalPages];
}

import { describe, expect, it } from 'vitest';

import {
  buildCourseCatalogHref,
  clampCourseCatalogPage,
  getCourseCatalogPageItems,
  normalizeCourseCatalogQuery,
} from '@/lib/courses/catalog-query';

describe('Course catalog URL contract', () => {
  it('normalizes unsupported facets and duplicate values to the default catalog', () => {
    const result = normalizeCourseCatalogQuery({
      search: ['  React  ', 'ignored'],
      price: 'cheap',
      tag: 'missing-tag',
      sort: 'popular',
      page: '-2',
      source: 'unexpected',
    }, ['frontend']);

    expect(result.query).toEqual({
      search: 'React',
      price: 'all',
      tag: 'all',
      preview: 'all',
      sort: 'newest',
      page: 1,
    });
    expect(result.isCanonical).toBe(false);
    expect(buildCourseCatalogHref(result.query)).toBe('/courses?search=React');
  });

  it('keeps an allowed canonical query unchanged', () => {
    const result = normalizeCourseCatalogQuery({
      search: 'React',
      price: 'paid',
      tag: 'frontend',
      sort: 'price-low',
      page: '3',
    }, ['frontend']);

    expect(result.query).toEqual({
      search: 'React',
      price: 'paid',
      tag: 'frontend',
      preview: 'all',
      sort: 'price-low',
      page: 3,
    });
    expect(result.isCanonical).toBe(true);
  });

  it('omits defaults and resets page when one facet changes', () => {
    const href = buildCourseCatalogHref({
      search: 'React',
      price: 'free',
      tag: 'frontend',
      preview: 'all',
      sort: 'price-high',
      page: 4,
    }, { price: 'all', page: 1 });

    expect(href).toBe('/courses?search=React&tag=frontend&sort=price-high');
  });

  it.each([
    [0, 1],
    [2, 2],
    [4, 4],
  ])('clamps page 10 against %i total pages', (totalPages, expectedPage) => {
    expect(clampCourseCatalogPage(10, totalPages)).toBe(expectedPage);
  });

  it('keeps first and last page context with ellipses around the current page', () => {
    expect(getCourseCatalogPageItems(6, 12)).toEqual([
      1,
      'start-ellipsis',
      5,
      6,
      7,
      'end-ellipsis',
      12,
    ]);
    expect(getCourseCatalogPageItems(2, 4)).toEqual([1, 2, 3, 4]);
  });
});

describe('Course catalog free-preview facet', () => {
  it('accepts preview=free from the Home call to action as canonical', () => {
    const result = normalizeCourseCatalogQuery({ preview: 'free' }, ['frontend']);

    expect(result.query.preview).toBe('free');
    expect(result.isCanonical).toBe(true);
    expect(buildCourseCatalogHref(result.query)).toBe('/courses?preview=free');
  });

  it('drops unknown preview values and omits the default from URLs', () => {
    const result = normalizeCourseCatalogQuery({ preview: 'paid' }, []);

    expect(result.query.preview).toBe('all');
    expect(result.isCanonical).toBe(false);
    expect(buildCourseCatalogHref(result.query)).toBe('/courses');
  });

  it('keeps preview while other facets change and clears it on request', () => {
    const query = normalizeCourseCatalogQuery({ preview: 'free', price: 'paid' }, []).query;

    expect(buildCourseCatalogHref(query, { page: 2 })).toBe('/courses?price=paid&preview=free&page=2');
    expect(buildCourseCatalogHref(query, { preview: 'all' })).toBe('/courses?price=paid');
  });
});

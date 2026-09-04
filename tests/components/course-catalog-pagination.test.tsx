// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import CourseCatalogPagination from '@/components/course/CourseCatalogPagination';

describe('CourseCatalogPagination', () => {
  it('renders shared pagination controls while preserving normalized facets', () => {
    render(
      <CourseCatalogPagination
        query={{
          search: 'React',
          price: 'paid',
          tag: 'frontend',
          sort: 'price-low',
          page: 6,
        }}
        totalPages={12}
      />,
    );

    expect(
      screen.getByRole('navigation', { name: 'หน้ารายการคอร์ส' }).getAttribute('data-slot'),
    ).toBe('pagination');
    expect(screen.getByRole('link', { name: '6' }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('link', { name: '7' }).getAttribute('href')).toBe(
      '/courses?search=React&price=paid&tag=frontend&sort=price-low&page=7',
    );
    expect(screen.getAllByText('More pages')).toHaveLength(2);
  });
});

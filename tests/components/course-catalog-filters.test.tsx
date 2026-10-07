// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import {
  CourseCatalogActiveFilters,
  CourseCatalogSearch,
  CourseCatalogTopics,
} from '@/components/course/CourseCatalogFilters';
import type { CourseCatalogQuery } from '@/lib/courses/catalog-query';

const query = (overrides: Partial<CourseCatalogQuery> = {}): CourseCatalogQuery => ({
  search: '',
  price: 'all',
  tag: 'all',
  preview: 'all',
  sort: 'newest',
  page: 1,
  ...overrides,
});

const topics = [
  { slug: 'javascript', name: 'JavaScript', count: 3 },
  { slug: 'react', name: 'React', count: 1 },
];

const link = (name: string) => screen.getByRole('link', { name });

describe('course catalog topics', () => {
  afterEach(cleanup);

  it('links every topic with its course count, starting from all courses', () => {
    render(<CourseCatalogTopics query={query()} topics={topics} total={4} />);
    const nav = screen.getByRole('navigation', { name: 'หัวข้อคอร์ส' });

    expect(within(nav).getAllByRole('link').map((item) => item.getAttribute('aria-label'))).toEqual(['ทั้งหมด 4 คอร์ส', 'JavaScript 3 คอร์ส', 'React 1 คอร์ส']);
    // The visible text stays inside the spoken name.
    expect(link('JavaScript 3 คอร์ส').textContent).toBe('JavaScript3');
    expect(link('ทั้งหมด 4 คอร์ส').getAttribute('href')).toBe('/courses');
    expect(link('ทั้งหมด 4 คอร์ส').getAttribute('aria-current')).toBe('page');
    expect(link('JavaScript 3 คอร์ส').getAttribute('href')).toBe('/courses?tag=javascript');
  });

  it('keeps the search and sort, resets the page, and marks only the chosen topic', () => {
    render(<CourseCatalogTopics query={query({ tag: 'react', search: 'hooks', sort: 'price-low', page: 3 })} topics={topics} total={4} />);

    expect(link('ทั้งหมด 4 คอร์ส').getAttribute('href')).toBe('/courses?search=hooks&sort=price-low');
    expect(link('React 1 คอร์ส').getAttribute('href')).toBe('/courses?search=hooks&tag=react&sort=price-low');
    expect(link('React 1 คอร์ส').getAttribute('aria-current')).toBe('page');
    expect(screen.getAllByRole('link').filter((item) => item.hasAttribute('aria-current'))).toHaveLength(1);
  });
});

describe('course catalog search', () => {
  afterEach(cleanup);

  it('submits the term as a GET form that keeps the other facets and starts at page one', () => {
    const { container } = render(
      <CourseCatalogSearch query={query({ search: 'React', tag: 'react', preview: 'free', sort: 'oldest', page: 2 })} />,
    );
    const form = screen.getByRole('search');

    expect(form.getAttribute('action')).toBe('/courses');
    expect((screen.getByLabelText('ค้นหาคอร์ส') as HTMLInputElement).value).toBe('React');
    expect([...container.querySelectorAll('input[type=hidden]')].map((input) => `${input.getAttribute('name')}=${input.getAttribute('value')}`))
      .toEqual(['tag=react', 'preview=free', 'sort=oldest']);
  });
});

describe('course catalog active filters', () => {
  afterEach(cleanup);

  it('offers a remove link for each filter without a chip, keeping the rest of the query', () => {
    render(<CourseCatalogActiveFilters query={query({ search: 'React', price: 'free', preview: 'free', tag: 'react', sort: 'price-low' })} />);

    expect(link('ลบคำค้น React').getAttribute('href')).toBe('/courses?price=free&tag=react&preview=free&sort=price-low');
    expect(link('ลบตัวกรองราคา ฟรี').getAttribute('href')).toBe('/courses?search=React&tag=react&preview=free&sort=price-low');
    // Home's "ทดลองบทเรียนฟรี" link lands on ?preview=free; the Required E2E removes it by this name.
    expect(link('ลบตัวกรอง มีบทเรียนทดลองฟรี').getAttribute('href')).toBe('/courses?search=React&price=free&tag=react&sort=price-low');
    // The topic has its own chip, so it gets no second remove link here.
    expect(screen.getAllByRole('link')).toHaveLength(3);
  });

  it('renders nothing when only a topic or the sort is chosen', () => {
    const { container } = render(<CourseCatalogActiveFilters query={query({ tag: 'react', sort: 'oldest' })} />);

    expect(container.innerHTML).toBe('');
  });
});

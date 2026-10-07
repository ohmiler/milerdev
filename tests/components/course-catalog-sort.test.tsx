// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

import CourseCatalogSort from '@/components/course/CourseCatalogSort';

describe('course catalog sort', () => {
  afterEach(() => {
    cleanup();
    push.mockReset();
  });

  it('re-sorts as soon as an option is picked, keeping the filters and returning to page one', () => {
    render(<CourseCatalogSort query={{ search: 'React', price: 'all', tag: 'react', preview: 'all', sort: 'newest', page: 2 }} />);

    fireEvent.change(screen.getByLabelText('เรียงตาม'), { target: { value: 'price-low' } });

    expect(push).toHaveBeenCalledWith('/courses?search=React&tag=react&sort=price-low');
  });

  it('still sorts without JavaScript through a GET form that carries the filters', () => {
    const { container } = render(<CourseCatalogSort query={{ search: '', price: 'free', tag: 'all', preview: 'free', sort: 'oldest', page: 1 }} />);
    const form = container.querySelector('form')!;

    expect(form.getAttribute('action')).toBe('/courses');
    expect([...form.querySelectorAll('input[type=hidden]')].map((input) => `${input.getAttribute('name')}=${input.getAttribute('value')}`))
      .toEqual(['price=free', 'preview=free']);
    expect((screen.getByLabelText('เรียงตาม') as HTMLSelectElement).value).toBe('oldest');
  });
});

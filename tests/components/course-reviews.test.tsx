// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import CourseReviews from '@/components/course/CourseReviews';

const navigationMocks = vi.hoisted(() => ({
  pathname: '/courses/typescript',
  query: '',
  push: vi.fn(),
  replace: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => navigationMocks.pathname,
  useRouter: () => ({ push: navigationMocks.push, replace: navigationMocks.replace }),
  useSearchParams: () => new URLSearchParams(navigationMocks.query),
}));

const emptyReviewResponse = {
  reviews: [],
  stats: { avgRating: 0, totalReviews: 0, distribution: {} },
  pagination: { page: 3, limit: 10, total: 0, totalPages: 0 },
};

describe('CourseReviews', () => {
  beforeEach(() => {
    navigationMocks.query = 'reviewSort=lowest&reviewRating=2&reviewPage=3';
    navigationMocks.push.mockReset();
    navigationMocks.replace.mockReset();
    vi.restoreAllMocks();
  });

  it('loads namespaced review state from the URL', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(emptyReviewResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    render(<CourseReviews courseSlug="typescript" isEnrolled={false} />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(String(fetchMock.mock.calls[0][0])).toBe(
      '/api/courses/typescript/reviews?page=3&sort=lowest&rating=2',
    );
  });

  it('shows a retryable error instead of interpreting a failed request as empty', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: 'failed' }), { status: 500 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(emptyReviewResponse), { status: 200 }));

    render(<CourseReviews courseSlug="typescript" isEnrolled={false} />);

    const retry = await screen.findByRole('button', { name: 'ลองโหลดรีวิวอีกครั้ง' });
    expect(screen.queryByText('ยังไม่มีรีวิว')).toBeNull();
    fireEvent.click(retry);

    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(2));
  });

  it('adds user-selected review state to browser history and resets the page', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(emptyReviewResponse), { status: 200 }),
    );

    render(<CourseReviews courseSlug="typescript" isEnrolled={false} />);
    await screen.findByText('ไม่พบรีวิวที่ตรงกับตัวกรอง');
    fireEvent.change(screen.getByRole('combobox', { name: 'เรียงรีวิว' }), {
      target: { value: 'highest' },
    });

    expect(navigationMocks.push).toHaveBeenCalledWith(
      '/courses/typescript?reviewSort=highest&reviewRating=2#course-reviews',
      { scroll: false },
    );
  });

  it('reloads from restored URL state after browser navigation', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(emptyReviewResponse), { status: 200 }),
    );
    const { rerender } = render(
      <CourseReviews courseSlug="typescript" isEnrolled={false} />,
    );
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    navigationMocks.query = 'reviewSort=highest&reviewPage=2';
    rerender(<CourseReviews courseSlug="typescript" isEnrolled={false} />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(String(fetchMock.mock.calls[1][0])).toBe(
      '/api/courses/typescript/reviews?page=2&sort=highest',
    );
  });
});
